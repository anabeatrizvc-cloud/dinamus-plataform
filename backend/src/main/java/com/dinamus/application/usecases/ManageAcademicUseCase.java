package com.dinamus.application.usecases;

import com.dinamus.application.ports.AcademicRepository;
import com.dinamus.application.ports.AuditPort;
import com.dinamus.application.ports.IdentityRepository;
import com.dinamus.domain.model.AttendanceAudit;
import com.dinamus.domain.model.AttendanceEntry;
import com.dinamus.domain.model.AttendanceSession;
import com.dinamus.domain.model.ActivitySummary;
import com.dinamus.domain.model.AttendanceReportRow;
import com.dinamus.domain.model.CourseSummary;
import com.dinamus.domain.model.DisciplineSummary;
import com.dinamus.domain.model.EnrollmentSummary;
import com.dinamus.domain.model.EvaluationSummary;
import com.dinamus.domain.model.GradeEntry;
import com.dinamus.domain.model.LessonSummary;
import com.dinamus.domain.model.MaterialSummary;
import com.dinamus.domain.model.MemberAccount;
import com.dinamus.domain.model.RecordedLesson;
import com.dinamus.domain.model.UserAccount;
import jakarta.inject.Singleton;

import java.net.URI;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Singleton
public class ManageAcademicUseCase {
    private final AcademicRepository academicRepository;
    private final IdentityRepository identityRepository;
    private final AuditPort audit;
    private final SecureRandom secureRandom = new SecureRandom();

    public ManageAcademicUseCase(AcademicRepository academicRepository, IdentityRepository identityRepository, AuditPort audit) {
        this.academicRepository = academicRepository;
        this.identityRepository = identityRepository;
        this.audit = audit;
    }

    public List<CourseSummary> listCourses() {
        return academicRepository.listCourses();
    }

    public List<DisciplineSummary> listDisciplines() {
        return academicRepository.listDisciplines();
    }

    public CourseSummary createCourse(String title, String description, String startsAt, String endsAt, String status) {
        return academicRepository.saveCourse(new CourseSummary(UUID.randomUUID().toString(), title.trim(), normalize(description), startsAt, normalize(endsAt), normalizeStatus(status)));
    }

    public DisciplineSummary createDiscipline(String courseId, String title, String description, List<String> teacherIds, int maxAbsences, boolean usesGrades) {
        academicRepository.findCourse(courseId).orElseThrow(() -> new IllegalArgumentException("Course not found"));
        if (sanitizeTeacherIds(teacherIds).isEmpty()) {
            throw new IllegalArgumentException("Selecione pelo menos um professor.");
        }
        return academicRepository.saveDiscipline(new DisciplineSummary(UUID.randomUUID().toString(), courseId, title.trim(), normalize(description), sanitizeTeacherIds(teacherIds), Math.max(0, maxAbsences), usesGrades));
    }

    public EnrollmentSummary enroll(String disciplineId, String studentId) {
        DisciplineSummary discipline = academicRepository.findDiscipline(disciplineId).orElseThrow(() -> new IllegalArgumentException("Discipline not found"));
        MemberAccount student = identityRepository.findMemberById(studentId).orElseThrow(() -> new IllegalArgumentException("Student not found"));
        if (!student.active()) {
            throw new IllegalArgumentException("Nao foi possivel matricular alunos inativos.");
        }
        if (academicRepository.listEnrollments().stream().anyMatch(item -> item.disciplineId().equals(discipline.id()) && item.studentId().equals(student.id()) && item.status().equals("ACTIVE"))) {
            throw new IllegalArgumentException("Este aluno ja esta matriculado neste curso.");
        }
        return academicRepository.saveEnrollment(new EnrollmentSummary(UUID.randomUUID().toString(), disciplineId, studentId, "ACTIVE"));
    }

    public LessonSummary createLesson(String teacherEmail, String disciplineId, String title, String lessonDate) {
        requireTeacherAccess(teacherEmail, disciplineId);
        return academicRepository.saveLesson(new LessonSummary(UUID.randomUUID().toString(), disciplineId, title.trim(), lessonDate, "", ""));
    }

    public MaterialSummary addMaterial(String teacherEmail, String disciplineId, String lessonId, String title, String url) {
        requireTeacherAccess(teacherEmail, disciplineId);
        return academicRepository.saveMaterial(new MaterialSummary(UUID.randomUUID().toString(), disciplineId, normalize(lessonId), title.trim(), url.trim()));
    }

    public EvaluationSummary addEvaluation(String teacherEmail, String disciplineId, String title, double weight, double maxScore) {
        requireTeacherAccess(teacherEmail, disciplineId);
        return academicRepository.saveEvaluation(new EvaluationSummary(UUID.randomUUID().toString(), disciplineId, title.trim(), Math.max(0, weight), Math.max(0, maxScore)));
    }

    public GradeEntry saveGrade(String teacherEmail, String evaluationId, String studentId, double score) {
        EvaluationSummary evaluation = academicRepository.listEvaluations().stream()
            .filter(item -> item.id().equals(evaluationId))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Evaluation not found"));
        requireTeacherAccess(teacherEmail, evaluation.disciplineId());
        if (score < 0 || score > evaluation.maxScore()) {
            throw new IllegalArgumentException("A nota precisa estar dentro da escala configurada.");
        }
        boolean enrolled = academicRepository.listEnrollments().stream()
            .anyMatch(item -> item.disciplineId().equals(evaluation.disciplineId()) && item.studentId().equals(studentId) && item.status().equals("ACTIVE"));
        if (!enrolled) {
            throw new SecurityException("Aluno nao pertence a esta disciplina.");
        }
        return academicRepository.saveGrade(new GradeEntry(UUID.randomUUID().toString(), evaluationId, studentId, Math.max(0, Math.min(score, evaluation.maxScore()))));
    }

    public LessonSummary generateAttendanceToken(String teacherEmail, String lessonId) {
        LessonSummary lesson = academicRepository.listLessons().stream()
            .filter(item -> item.id().equals(lessonId))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Lesson not found"));
        UserAccount user = requireTeacherAccess(teacherEmail, lesson.disciplineId());
        if (academicRepository.listAttendanceSessions().stream().anyMatch(session -> session.lessonId().equals(lesson.id()) && session.status().equals("OPEN") && Instant.parse(session.expiresAt()).isAfter(Instant.now()))) {
            throw new IllegalArgumentException("Ja existe uma chamada aberta para esta aula.");
        }
        String token = secureToken();
        String publicCode = publicCode(token);
        AttendanceSession session = new AttendanceSession(
            UUID.randomUUID().toString(),
            lesson.id(),
            hash(token),
            publicCode,
            user.id(),
            Instant.now().toString(),
            Instant.now().plus(20, ChronoUnit.MINUTES).toString(),
            "",
            "OPEN",
            nextSessionVersion(lesson.id())
        );
        academicRepository.saveAttendanceSession(session);
        audit.record(user.id(), "ATTENDANCE_SESSION_OPENED", session.id());
        return new LessonSummary(
            lesson.id(),
            lesson.disciplineId(),
            lesson.title(),
            lesson.lessonDate(),
            token,
            session.expiresAt()
        );
    }

    public AttendanceEntry validateAttendance(String teacherEmail, String attendanceId, boolean present) {
        AttendanceEntry attendance = academicRepository.listAttendance().stream()
            .filter(item -> item.id().equals(attendanceId))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Attendance not found"));
        LessonSummary lesson = academicRepository.listLessons().stream()
            .filter(item -> item.id().equals(attendance.lessonId()))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Lesson not found"));
        UserAccount user = requireTeacherAccess(teacherEmail, lesson.disciplineId());
        String newStatus = present ? "PRESENT" : "INVALIDATED";
        AttendanceEntry saved = academicRepository.saveAttendance(new AttendanceEntry(attendance.id(), attendance.lessonId(), attendance.studentId(), newStatus, attendance.scannedAt(), Instant.now().toString()));
        recordAttendanceAudit(user.id(), attendance, saved, present ? "Validacao do professor" : "Invalidacao do professor");
        return saved;
    }

    public List<AttendanceEntry> validateAll(String teacherEmail, String lessonId) {
        LessonSummary lesson = academicRepository.listLessons().stream()
            .filter(item -> item.id().equals(lessonId))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Lesson not found"));
        UserAccount user = requireTeacherAccess(teacherEmail, lesson.disciplineId());
        academicRepository.listAttendance().stream()
            .filter(item -> item.lessonId().equals(lessonId))
            .filter(item -> item.status().equals("PENDING") || item.status().equals("PENDING_VALIDATION"))
            .forEach(item -> {
                AttendanceEntry saved = academicRepository.saveAttendance(new AttendanceEntry(item.id(), item.lessonId(), item.studentId(), "PRESENT", item.scannedAt(), Instant.now().toString()));
                recordAttendanceAudit(user.id(), item, saved, "Validacao em lote");
            });
        return academicRepository.listAttendance().stream().filter(item -> item.lessonId().equals(lessonId)).toList();
    }

    public AttendanceEntry justifyAttendance(String teacherEmail, String attendanceId) {
        AttendanceEntry attendance = academicRepository.listAttendance().stream()
            .filter(item -> item.id().equals(attendanceId))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Attendance not found"));
        LessonSummary lesson = academicRepository.listLessons().stream()
            .filter(item -> item.id().equals(attendance.lessonId()))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Lesson not found"));
        UserAccount user = requireTeacherAccess(teacherEmail, lesson.disciplineId());
        AttendanceEntry saved = academicRepository.saveAttendance(new AttendanceEntry(attendance.id(), attendance.lessonId(), attendance.studentId(), "JUSTIFIED_ABSENCE", attendance.scannedAt(), Instant.now().toString()));
        recordAttendanceAudit(user.id(), attendance, saved, "Falta justificada");
        return saved;
    }

    public List<AttendanceEntry> lessonAttendance(String teacherEmail, String lessonId) {
        LessonSummary lesson = academicRepository.listLessons().stream()
            .filter(item -> item.id().equals(lessonId))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Lesson not found"));
        requireTeacherAccess(teacherEmail, lesson.disciplineId());
        return academicRepository.listAttendance().stream().filter(item -> item.lessonId().equals(lessonId)).toList();
    }

    public AttendanceSession closeAttendanceSession(String teacherEmail, String sessionId) {
        AttendanceSession session = academicRepository.listAttendanceSessions().stream()
            .filter(item -> item.id().equals(sessionId))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Attendance session not found"));
        LessonSummary lesson = academicRepository.listLessons().stream()
            .filter(item -> item.id().equals(session.lessonId()))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Lesson not found"));
        UserAccount user = requireTeacherAccess(teacherEmail, lesson.disciplineId());
        AttendanceSession saved = academicRepository.saveAttendanceSession(new AttendanceSession(session.id(), session.lessonId(), session.tokenHash(), session.publicCode(), session.openedBy(), session.openedAt(), session.expiresAt(), Instant.now().toString(), "CLOSED", session.version()));
        audit.record(user.id(), "ATTENDANCE_SESSION_CLOSED", saved.id());
        return saved;
    }

    public AttendanceSession extendAttendanceSession(String teacherEmail, String sessionId, int minutes) {
        AttendanceSession session = academicRepository.listAttendanceSessions().stream()
            .filter(item -> item.id().equals(sessionId))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Attendance session not found"));
        LessonSummary lesson = academicRepository.listLessons().stream()
            .filter(item -> item.id().equals(session.lessonId()))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Lesson not found"));
        UserAccount user = requireTeacherAccess(teacherEmail, lesson.disciplineId());
        Instant base = session.expiresAt().isBlank() || Instant.parse(session.expiresAt()).isBefore(Instant.now()) ? Instant.now() : Instant.parse(session.expiresAt());
        AttendanceSession saved = academicRepository.saveAttendanceSession(new AttendanceSession(session.id(), session.lessonId(), session.tokenHash(), session.publicCode(), session.openedBy(), session.openedAt(), base.plus(Math.max(1, minutes), ChronoUnit.MINUTES).toString(), "", "OPEN", session.version()));
        audit.record(user.id(), "ATTENDANCE_SESSION_EXTENDED", saved.id());
        return saved;
    }

    public RecordedLesson addRecording(String teacherEmail, String disciplineId, String lessonId, String title, String youtubeUrl, boolean visibleToStudents) {
        UserAccount user = requireTeacherAccess(teacherEmail, disciplineId);
        if (!lessonId.isBlank()) {
            LessonSummary lesson = academicRepository.listLessons().stream()
                .filter(item -> item.id().equals(lessonId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Lesson not found"));
            if (!lesson.disciplineId().equals(disciplineId)) {
                throw new IllegalArgumentException("Aula nao pertence a esta disciplina.");
            }
        }
        String videoId = youtubeVideoId(youtubeUrl);
        RecordedLesson recording = new RecordedLesson(
            UUID.randomUUID().toString(),
            disciplineId,
            normalize(lessonId),
            title.trim(),
            "YOUTUBE",
            videoId,
            "https://www.youtube-nocookie.com/embed/" + videoId,
            visibleToStudents,
            user.id(),
            Instant.now().toString()
        );
        return academicRepository.saveRecording(recording);
    }

    public ActivitySummary addActivity(String teacherEmail, String disciplineId, String lessonId, String title, String description, String dueAt, double points) {
        requireTeacherAccess(teacherEmail, disciplineId);
        if (!lessonId.isBlank()) {
            LessonSummary lesson = academicRepository.listLessons().stream()
                .filter(item -> item.id().equals(lessonId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Lesson not found"));
            if (!lesson.disciplineId().equals(disciplineId)) {
                throw new IllegalArgumentException("Aula nao pertence a esta disciplina.");
            }
        }
        return academicRepository.saveActivity(new ActivitySummary(UUID.randomUUID().toString(), disciplineId, normalize(lessonId), title.trim(), normalize(description), normalize(dueAt), Math.max(0, points), "PUBLISHED"));
    }

    public List<AttendanceReportRow> attendanceReport(String disciplineId) {
        DisciplineSummary discipline = academicRepository.findDiscipline(disciplineId).orElseThrow(() -> new IllegalArgumentException("Discipline not found"));
        int lessonCount = (int) academicRepository.listLessons().stream().filter(item -> item.disciplineId().equals(discipline.id())).count();
        return academicRepository.listEnrollments().stream()
            .filter(item -> item.disciplineId().equals(discipline.id()) && item.status().equals("ACTIVE"))
            .map(enrollment -> {
                MemberAccount student = identityRepository.findMemberById(enrollment.studentId()).orElse(new MemberAccount(enrollment.studentId(), "Aluno", "", "", "", List.of("MEMBRO"), true, ""));
                int presences = (int) academicRepository.listAttendance().stream()
                    .filter(item -> item.studentId().equals(enrollment.studentId()))
                    .filter(item -> academicRepository.listLessons().stream().anyMatch(lesson -> lesson.id().equals(item.lessonId()) && lesson.disciplineId().equals(discipline.id())))
                    .filter(item -> item.status().equals("PRESENT") || item.status().equals("VALIDATED") || item.status().equals("JUSTIFIED_ABSENCE"))
                    .count();
                int absences = Math.max(0, lessonCount - presences);
                double frequency = lessonCount == 0 ? 0 : (presences * 100.0) / lessonCount;
                String situation = absences <= discipline.maxAbsences() ? "Dentro do limite" : "Acima do limite";
                return new AttendanceReportRow(student.id(), student.name(), presences, absences, Math.round(frequency * 10.0) / 10.0, situation);
            })
            .toList();
    }

    private UserAccount requireTeacherAccess(String email, String disciplineId) {
        UserAccount user = current(email);
        if (user.roles().contains("ADMIN")) {
            return user;
        }
        DisciplineSummary discipline = academicRepository.findDiscipline(disciplineId).orElseThrow(() -> new IllegalArgumentException("Discipline not found"));
        if (!user.roles().contains("PROFESSOR") || !discipline.teacherIds().contains(user.id())) {
            throw new SecurityException("Teacher access denied");
        }
        return user;
    }

    private List<String> sanitizeTeacherIds(List<String> teacherIds) {
        return new LinkedHashSet<>(teacherIds == null ? List.<String>of() : teacherIds).stream()
            .filter(id -> identityRepository.findMemberById(id).map(member -> member.roles().contains("PROFESSOR")).orElse(false))
            .toList();
    }

    private UserAccount current(String principal) {
        return identityRepository.findUserByEmail(principal)
            .or(() -> identityRepository.findMemberById(principal).map(MemberAccount::toUserAccount))
            .orElseThrow(() -> new SecurityException("User not found"));
    }

    private String normalizeStatus(String value) {
        String status = normalize(value).toUpperCase();
        return status.isBlank() ? "OPEN" : status;
    }

    private int nextSessionVersion(String lessonId) {
        return academicRepository.listAttendanceSessions().stream()
            .filter(item -> item.lessonId().equals(lessonId))
            .mapToInt(AttendanceSession::version)
            .max()
            .orElse(0) + 1;
    }

    private void recordAttendanceAudit(String actorId, AttendanceEntry previous, AttendanceEntry saved, String reason) {
        academicRepository.saveAttendanceAudit(new AttendanceAudit(UUID.randomUUID().toString(), saved.id(), actorId, Instant.now().toString(), previous.status(), saved.status(), reason));
        audit.record(actorId, "ATTENDANCE_STATUS_CHANGED", saved.id());
    }

    private String secureToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    private String publicCode(String token) {
        return token.substring(0, 8).toUpperCase(Locale.ROOT);
    }

    private String hash(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes()));
        } catch (Exception exception) {
            throw new IllegalStateException("Could not hash token", exception);
        }
    }

    private String youtubeVideoId(String url) {
        String value = normalize(url);
        try {
            URI uri = URI.create(value);
            String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
            if (host.endsWith("youtu.be")) {
                String path = uri.getPath().replaceFirst("^/", "");
                if (!path.isBlank()) {
                    return path;
                }
            }
            if (host.contains("youtube.com") || host.contains("youtube-nocookie.com")) {
                String query = uri.getQuery() == null ? "" : uri.getQuery();
                for (String part : query.split("&")) {
                    String[] pair = part.split("=", 2);
                    if (pair.length == 2 && pair[0].equals("v") && !pair[1].isBlank()) {
                        return pair[1];
                    }
                }
                String path = uri.getPath();
                if (path.startsWith("/embed/") || path.startsWith("/shorts/")) {
                    return path.substring(path.lastIndexOf('/') + 1);
                }
            }
        } catch (Exception ignored) {
        }
        throw new IllegalArgumentException("Link de video invalido.");
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}
