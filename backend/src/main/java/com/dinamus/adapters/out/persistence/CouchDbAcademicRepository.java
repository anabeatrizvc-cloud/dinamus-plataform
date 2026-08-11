package com.dinamus.adapters.out.persistence;

import com.dinamus.application.ports.AcademicRepository;
import com.dinamus.domain.model.AttendanceEntry;
import com.dinamus.domain.model.CourseSummary;
import com.dinamus.domain.model.DisciplineSummary;
import com.dinamus.domain.model.EnrollmentSummary;
import com.dinamus.domain.model.EvaluationSummary;
import com.dinamus.domain.model.GradeEntry;
import com.dinamus.domain.model.LessonSummary;
import com.dinamus.domain.model.MaterialSummary;
import io.micronaut.context.annotation.Requires;
import io.micronaut.serde.ObjectMapper;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.annotation.PostConstruct;
import jakarta.inject.Singleton;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Singleton
@Requires(property = "couchdb.enabled", value = "true")
public class CouchDbAcademicRepository implements AcademicRepository {
    private static final String DOCUMENT_ID = "academic:state";

    private final CouchDbProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient client;

    public CouchDbAcademicRepository(CouchDbProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
    }

    @PostConstruct
    void ensureState() {
        request("PUT", databaseUri(), "");
        if (readState().isEmpty()) {
            saveState(seedState());
            return;
        }
        readState().map(this::withoutDemoContent).filter(AcademicState::changed).ifPresent(state -> saveState(state.withoutChangedFlag()));
    }

    @Override
    public List<CourseSummary> listCourses() {
        return readState().map(AcademicState::courses).orElseGet(List::of);
    }

    @Override
    public CourseSummary saveCourse(CourseSummary course) {
        AcademicState state = readState().orElseGet(this::seedState);
        List<CourseSummary> items = replace(state.courses(), course, CourseSummary::id);
        saveState(state.withCourses(items));
        return course;
    }

    @Override
    public Optional<CourseSummary> findCourse(String id) {
        return listCourses().stream().filter(course -> course.id().equals(id)).findFirst();
    }

    @Override
    public List<DisciplineSummary> listDisciplines() {
        return readState().map(AcademicState::disciplines).orElseGet(List::of);
    }

    @Override
    public DisciplineSummary saveDiscipline(DisciplineSummary discipline) {
        AcademicState state = readState().orElseGet(this::seedState);
        saveState(state.withDisciplines(replace(state.disciplines(), discipline, DisciplineSummary::id)));
        return discipline;
    }

    @Override
    public Optional<DisciplineSummary> findDiscipline(String id) {
        return listDisciplines().stream().filter(discipline -> discipline.id().equals(id)).findFirst();
    }

    @Override
    public EnrollmentSummary saveEnrollment(EnrollmentSummary enrollment) {
        AcademicState state = readState().orElseGet(this::seedState);
        List<EnrollmentSummary> enrollments = new ArrayList<>(state.enrollments());
        enrollments.removeIf(item -> item.disciplineId().equals(enrollment.disciplineId()) && item.studentId().equals(enrollment.studentId()));
        enrollments.add(enrollment);
        saveState(state.withEnrollments(enrollments));
        return enrollment;
    }

    @Override
    public List<EnrollmentSummary> listEnrollments() {
        return readState().map(AcademicState::enrollments).orElseGet(List::of);
    }

    @Override
    public LessonSummary saveLesson(LessonSummary lesson) {
        AcademicState state = readState().orElseGet(this::seedState);
        saveState(state.withLessons(replace(state.lessons(), lesson, LessonSummary::id)));
        return lesson;
    }

    @Override
    public List<LessonSummary> listLessons() {
        return readState().map(AcademicState::lessons).orElseGet(List::of);
    }

    @Override
    public MaterialSummary saveMaterial(MaterialSummary material) {
        AcademicState state = readState().orElseGet(this::seedState);
        saveState(state.withMaterials(replace(state.materials(), material, MaterialSummary::id)));
        return material;
    }

    @Override
    public List<MaterialSummary> listMaterials() {
        return readState().map(AcademicState::materials).orElseGet(List::of);
    }

    @Override
    public EvaluationSummary saveEvaluation(EvaluationSummary evaluation) {
        AcademicState state = readState().orElseGet(this::seedState);
        saveState(state.withEvaluations(replace(state.evaluations(), evaluation, EvaluationSummary::id)));
        return evaluation;
    }

    @Override
    public List<EvaluationSummary> listEvaluations() {
        return readState().map(AcademicState::evaluations).orElseGet(List::of);
    }

    @Override
    public GradeEntry saveGrade(GradeEntry grade) {
        AcademicState state = readState().orElseGet(this::seedState);
        List<GradeEntry> grades = new ArrayList<>(state.grades());
        grades.removeIf(item -> item.evaluationId().equals(grade.evaluationId()) && item.studentId().equals(grade.studentId()));
        grades.add(grade);
        saveState(state.withGrades(grades));
        return grade;
    }

    @Override
    public List<GradeEntry> listGrades() {
        return readState().map(AcademicState::grades).orElseGet(List::of);
    }

    @Override
    public AttendanceEntry saveAttendance(AttendanceEntry attendance) {
        AcademicState state = readState().orElseGet(this::seedState);
        saveState(state.withAttendance(replace(state.attendance(), attendance, AttendanceEntry::id)));
        return attendance;
    }

    @Override
    public List<AttendanceEntry> listAttendance() {
        return readState().map(AcademicState::attendance).orElseGet(List::of);
    }

    private <T> List<T> replace(List<T> items, T value, IdReader<T> reader) {
        List<T> changed = new ArrayList<>(items);
        changed.removeIf(item -> reader.id(item).equals(reader.id(value)));
        changed.add(value);
        return changed;
    }

    private Optional<AcademicState> readState() {
        try {
            Optional<String> response = request("GET", documentUri(), "");
            if (response.isEmpty()) {
                return Optional.empty();
            }
            StateDocument document = objectMapper.readValue(response.get(), StateDocument.class);
            return Optional.of(AcademicState.fromDocument(document));
        } catch (Exception exception) {
            return Optional.empty();
        }
    }

    private void saveState(AcademicState state) {
        try {
            Map<String, Object> document = state.rev().isBlank()
                ? Map.of("_id", DOCUMENT_ID, "courses", state.courses(), "disciplines", state.disciplines(), "enrollments", state.enrollments(), "lessons", state.lessons(), "materials", state.materials(), "evaluations", state.evaluations(), "grades", state.grades(), "attendance", state.attendance())
                : Map.of("_id", DOCUMENT_ID, "_rev", state.rev(), "courses", state.courses(), "disciplines", state.disciplines(), "enrollments", state.enrollments(), "lessons", state.lessons(), "materials", state.materials(), "evaluations", state.evaluations(), "grades", state.grades(), "attendance", state.attendance());
            if (request("PUT", documentUri(), objectMapper.writeValueAsString(document)).isEmpty()) {
                throw new IllegalStateException("Could not persist academic state");
            }
        } catch (Exception exception) {
            throw new IllegalStateException("Could not persist academic state", exception);
        }
    }

    private AcademicState seedState() {
        return new AcademicState(
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            "",
            false
        );
    }

    private AcademicState withoutDemoContent(AcademicState state) {
        List<CourseSummary> courses = state.courses().stream().filter(item -> !item.id().equals("curso-fundamentos")).toList();
        List<DisciplineSummary> disciplines = state.disciplines().stream().filter(item -> !item.id().equals("disc-doutrina") && !item.courseId().equals("curso-fundamentos")).toList();
        List<EnrollmentSummary> enrollments = state.enrollments().stream().filter(item -> !item.disciplineId().equals("disc-doutrina") && !item.studentId().equals("aluno-demo")).toList();
        List<LessonSummary> lessons = state.lessons().stream().filter(item -> !item.id().equals("lesson-01") && !item.id().equals("lesson-02") && !item.disciplineId().equals("disc-doutrina")).toList();
        List<MaterialSummary> materials = state.materials().stream().filter(item -> !item.id().equals("material-01") && !item.disciplineId().equals("disc-doutrina")).toList();
        List<EvaluationSummary> evaluations = state.evaluations().stream().filter(item -> !item.id().equals("eval-01") && !item.disciplineId().equals("disc-doutrina")).toList();
        List<GradeEntry> grades = state.grades().stream().filter(item -> !item.id().equals("grade-01") && !item.studentId().equals("aluno-demo") && !item.evaluationId().equals("eval-01")).toList();
        List<AttendanceEntry> attendance = state.attendance().stream().filter(item -> !item.studentId().equals("aluno-demo") && !item.lessonId().equals("lesson-01") && !item.lessonId().equals("lesson-02")).toList();
        boolean changed = courses.size() != state.courses().size()
            || disciplines.size() != state.disciplines().size()
            || enrollments.size() != state.enrollments().size()
            || lessons.size() != state.lessons().size()
            || materials.size() != state.materials().size()
            || evaluations.size() != state.evaluations().size()
            || grades.size() != state.grades().size()
            || attendance.size() != state.attendance().size();
        return new AcademicState(courses, disciplines, enrollments, lessons, materials, evaluations, grades, attendance, state.rev(), changed);
    }

    private Optional<String> request(String method, String uri, String body) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(uri))
                .timeout(Duration.ofSeconds(5))
                .header("Authorization", "Basic " + credentials())
                .header("Content-Type", "application/json")
                .method(method, HttpRequest.BodyPublishers.ofString(body))
                .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return Optional.of(response.body());
            }
        } catch (Exception ignored) {
        }
        return Optional.empty();
    }

    private String documentUri() {
        return databaseUri() + "/" + URLEncoder.encode(DOCUMENT_ID, StandardCharsets.UTF_8);
    }

    private String databaseUri() {
        return properties.getUrl() + "/" + properties.getDatabase();
    }

    private String credentials() {
        String value = properties.getUsername() + ":" + properties.getPassword();
        return Base64.getEncoder().encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    interface IdReader<T> {
        String id(T value);
    }

    record AcademicState(
        List<CourseSummary> courses,
        List<DisciplineSummary> disciplines,
        List<EnrollmentSummary> enrollments,
        List<LessonSummary> lessons,
        List<MaterialSummary> materials,
        List<EvaluationSummary> evaluations,
        List<GradeEntry> grades,
        List<AttendanceEntry> attendance,
        String rev,
        boolean changed
    ) {
        static AcademicState fromDocument(StateDocument document) {
            return new AcademicState(
                document.courses() == null ? List.of() : document.courses(),
                document.disciplines() == null ? List.of() : document.disciplines(),
                document.enrollments() == null ? List.of() : document.enrollments(),
                document.lessons() == null ? List.of() : document.lessons(),
                document.materials() == null ? List.of() : document.materials(),
                document.evaluations() == null ? List.of() : document.evaluations(),
                document.grades() == null ? List.of() : document.grades(),
                document.attendance() == null ? List.of() : document.attendance(),
                document._rev(),
                false
            );
        }

        AcademicState withCourses(List<CourseSummary> value) {
            return new AcademicState(value, disciplines, enrollments, lessons, materials, evaluations, grades, attendance, rev, false);
        }

        AcademicState withDisciplines(List<DisciplineSummary> value) {
            return new AcademicState(courses, value, enrollments, lessons, materials, evaluations, grades, attendance, rev, false);
        }

        AcademicState withEnrollments(List<EnrollmentSummary> value) {
            return new AcademicState(courses, disciplines, value, lessons, materials, evaluations, grades, attendance, rev, false);
        }

        AcademicState withLessons(List<LessonSummary> value) {
            return new AcademicState(courses, disciplines, enrollments, value, materials, evaluations, grades, attendance, rev, false);
        }

        AcademicState withMaterials(List<MaterialSummary> value) {
            return new AcademicState(courses, disciplines, enrollments, lessons, value, evaluations, grades, attendance, rev, false);
        }

        AcademicState withEvaluations(List<EvaluationSummary> value) {
            return new AcademicState(courses, disciplines, enrollments, lessons, materials, value, grades, attendance, rev, false);
        }

        AcademicState withGrades(List<GradeEntry> value) {
            return new AcademicState(courses, disciplines, enrollments, lessons, materials, evaluations, value, attendance, rev, false);
        }

        AcademicState withAttendance(List<AttendanceEntry> value) {
            return new AcademicState(courses, disciplines, enrollments, lessons, materials, evaluations, grades, value, rev, false);
        }

        AcademicState withoutChangedFlag() {
            return new AcademicState(courses, disciplines, enrollments, lessons, materials, evaluations, grades, attendance, rev, false);
        }
    }

    @Serdeable
    record StateDocument(
        String _id,
        String _rev,
        List<CourseSummary> courses,
        List<DisciplineSummary> disciplines,
        List<EnrollmentSummary> enrollments,
        List<LessonSummary> lessons,
        List<MaterialSummary> materials,
        List<EvaluationSummary> evaluations,
        List<GradeEntry> grades,
        List<AttendanceEntry> attendance
    ) {
    }
}
