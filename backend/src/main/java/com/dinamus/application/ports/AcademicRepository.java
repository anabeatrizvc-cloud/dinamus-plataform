package com.dinamus.application.ports;

import com.dinamus.domain.model.AttendanceEntry;
import com.dinamus.domain.model.CourseSummary;
import com.dinamus.domain.model.DisciplineSummary;
import com.dinamus.domain.model.EnrollmentSummary;
import com.dinamus.domain.model.EvaluationSummary;
import com.dinamus.domain.model.GradeEntry;
import com.dinamus.domain.model.LessonSummary;
import com.dinamus.domain.model.MaterialSummary;

import java.util.List;
import java.util.Optional;

public interface AcademicRepository {
    List<CourseSummary> listCourses();

    CourseSummary saveCourse(CourseSummary course);

    Optional<CourseSummary> findCourse(String id);

    List<DisciplineSummary> listDisciplines();

    DisciplineSummary saveDiscipline(DisciplineSummary discipline);

    Optional<DisciplineSummary> findDiscipline(String id);

    EnrollmentSummary saveEnrollment(EnrollmentSummary enrollment);

    List<EnrollmentSummary> listEnrollments();

    LessonSummary saveLesson(LessonSummary lesson);

    List<LessonSummary> listLessons();

    MaterialSummary saveMaterial(MaterialSummary material);

    List<MaterialSummary> listMaterials();

    EvaluationSummary saveEvaluation(EvaluationSummary evaluation);

    List<EvaluationSummary> listEvaluations();

    GradeEntry saveGrade(GradeEntry grade);

    List<GradeEntry> listGrades();

    AttendanceEntry saveAttendance(AttendanceEntry attendance);

    List<AttendanceEntry> listAttendance();
}
