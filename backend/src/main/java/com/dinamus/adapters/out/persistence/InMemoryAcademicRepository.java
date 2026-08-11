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
import jakarta.inject.Singleton;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;

@Singleton
@Requires(property = "couchdb.enabled", notEquals = "true")
public class InMemoryAcademicRepository implements AcademicRepository {
    private final List<CourseSummary> courses = new CopyOnWriteArrayList<>(List.of(
        new CourseSummary("curso-fundamentos", "Fundamentos DNMS", "Formacao essencial para novos membros e lideres em desenvolvimento.", "2026-08-20", "2026-10-20", "OPEN")
    ));
    private final List<DisciplineSummary> disciplines = new CopyOnWriteArrayList<>(List.of(
        new DisciplineSummary("disc-doutrina", "curso-fundamentos", "Doutrina e vida crista", "Aulas praticas sobre fundamentos da fe, rotina devocional e servico.", List.of("professor-demo"), 2, true)
    ));
    private final List<EnrollmentSummary> enrollments = new CopyOnWriteArrayList<>(List.of(
        new EnrollmentSummary("enroll-ana", "disc-doutrina", "aluno-demo", "ACTIVE")
    ));
    private final List<LessonSummary> lessons = new CopyOnWriteArrayList<>(List.of(
        new LessonSummary("lesson-01", "disc-doutrina", "Identidade e familia espiritual", "2026-08-20", "", ""),
        new LessonSummary("lesson-02", "disc-doutrina", "Discipulado no cotidiano", "2026-08-27", "", "")
    ));
    private final List<MaterialSummary> materials = new CopyOnWriteArrayList<>(List.of(
        new MaterialSummary("material-01", "disc-doutrina", "lesson-01", "Guia da aula 1", "https://dinamus.recife/materiais/guia-aula-1")
    ));
    private final List<EvaluationSummary> evaluations = new CopyOnWriteArrayList<>(List.of(
        new EvaluationSummary("eval-01", "disc-doutrina", "Resumo aplicado", 1, 10)
    ));
    private final List<GradeEntry> grades = new CopyOnWriteArrayList<>(List.of(
        new GradeEntry("grade-01", "eval-01", "aluno-demo", 8.5)
    ));
    private final List<AttendanceEntry> attendance = new CopyOnWriteArrayList<>();

    @Override
    public List<CourseSummary> listCourses() {
        return new ArrayList<>(courses);
    }

    @Override
    public CourseSummary saveCourse(CourseSummary course) {
        courses.removeIf(item -> item.id().equals(course.id()));
        courses.add(course);
        return course;
    }

    @Override
    public Optional<CourseSummary> findCourse(String id) {
        return listCourses().stream().filter(course -> course.id().equals(id)).findFirst();
    }

    @Override
    public List<DisciplineSummary> listDisciplines() {
        return new ArrayList<>(disciplines);
    }

    @Override
    public DisciplineSummary saveDiscipline(DisciplineSummary discipline) {
        disciplines.removeIf(item -> item.id().equals(discipline.id()));
        disciplines.add(discipline);
        return discipline;
    }

    @Override
    public Optional<DisciplineSummary> findDiscipline(String id) {
        return listDisciplines().stream().filter(discipline -> discipline.id().equals(id)).findFirst();
    }

    @Override
    public EnrollmentSummary saveEnrollment(EnrollmentSummary enrollment) {
        enrollments.removeIf(item -> item.disciplineId().equals(enrollment.disciplineId()) && item.studentId().equals(enrollment.studentId()));
        enrollments.add(enrollment);
        return enrollment;
    }

    @Override
    public List<EnrollmentSummary> listEnrollments() {
        return new ArrayList<>(enrollments);
    }

    @Override
    public LessonSummary saveLesson(LessonSummary lesson) {
        lessons.removeIf(item -> item.id().equals(lesson.id()));
        lessons.add(lesson);
        return lesson;
    }

    @Override
    public List<LessonSummary> listLessons() {
        return new ArrayList<>(lessons);
    }

    @Override
    public MaterialSummary saveMaterial(MaterialSummary material) {
        materials.removeIf(item -> item.id().equals(material.id()));
        materials.add(material);
        return material;
    }

    @Override
    public List<MaterialSummary> listMaterials() {
        return new ArrayList<>(materials);
    }

    @Override
    public EvaluationSummary saveEvaluation(EvaluationSummary evaluation) {
        evaluations.removeIf(item -> item.id().equals(evaluation.id()));
        evaluations.add(evaluation);
        return evaluation;
    }

    @Override
    public List<EvaluationSummary> listEvaluations() {
        return new ArrayList<>(evaluations);
    }

    @Override
    public GradeEntry saveGrade(GradeEntry grade) {
        grades.removeIf(item -> item.evaluationId().equals(grade.evaluationId()) && item.studentId().equals(grade.studentId()));
        grades.add(grade);
        return grade;
    }

    @Override
    public List<GradeEntry> listGrades() {
        return new ArrayList<>(grades);
    }

    @Override
    public AttendanceEntry saveAttendance(AttendanceEntry entry) {
        attendance.removeIf(item -> item.id().equals(entry.id()));
        attendance.add(entry);
        return entry;
    }

    @Override
    public List<AttendanceEntry> listAttendance() {
        return new ArrayList<>(attendance);
    }
}
