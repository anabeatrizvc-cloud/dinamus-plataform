package com.dinamus.application.usecases;

import com.dinamus.application.ports.AcademicRepository;
import com.dinamus.application.ports.IdentityRepository;
import com.dinamus.domain.model.AttendanceEntry;
import com.dinamus.domain.model.CourseSummary;
import com.dinamus.domain.model.DisciplineSummary;
import com.dinamus.domain.model.EnrollmentSummary;
import com.dinamus.domain.model.EvaluationSummary;
import com.dinamus.domain.model.GradeEntry;
import com.dinamus.domain.model.LessonSummary;
import com.dinamus.domain.model.MaterialSummary;
import com.dinamus.domain.model.MemberAccount;
import com.dinamus.domain.model.UserAccount;
import jakarta.inject.Singleton;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;

@Singleton
public class ManageAcademicUseCase {
    private final AcademicRepository academicRepository;
    private final IdentityRepository identityRepository;

    public ManageAcademicUseCase(AcademicRepository academicRepository, IdentityRepository identityRepository) {
        this.academicRepository = academicRepository;
        this.identityRepository = identityRepository;
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
        return academicRepository.saveDiscipline(new DisciplineSummary(UUID.randomUUID().toString(), courseId, title.trim(), normalize(description), sanitizeTeacherIds(teacherIds), Math.max(0, maxAbsences), usesGrades));
    }

    public EnrollmentSummary enroll(String disciplineId, String studentId) {
        academicRepository.findDiscipline(disciplineId).orElseThrow(() -> new IllegalArgumentException("Discipline not found"));
        identityRepository.findMemberById(studentId).orElseThrow(() -> new IllegalArgumentException("Student not found"));
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
        return academicRepository.saveGrade(new GradeEntry(UUID.randomUUID().toString(), evaluationId, studentId, Math.max(0, Math.min(score, evaluation.maxScore()))));
    }

    public LessonSummary generateAttendanceToken(String teacherEmail, String lessonId) {
        LessonSummary lesson = academicRepository.listLessons().stream()
            .filter(item -> item.id().equals(lessonId))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Lesson not found"));
        requireTeacherAccess(teacherEmail, lesson.disciplineId());
        return academicRepository.saveLesson(new LessonSummary(
            lesson.id(),
            lesson.disciplineId(),
            lesson.title(),
            lesson.lessonDate(),
            UUID.randomUUID().toString(),
            Instant.now().plus(20, ChronoUnit.MINUTES).toString()
        ));
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
        requireTeacherAccess(teacherEmail, lesson.disciplineId());
        return academicRepository.saveAttendance(new AttendanceEntry(attendance.id(), attendance.lessonId(), attendance.studentId(), present ? "VALIDATED" : "REJECTED", attendance.scannedAt(), Instant.now().toString()));
    }

    public List<AttendanceEntry> validateAll(String teacherEmail, String lessonId) {
        LessonSummary lesson = academicRepository.listLessons().stream()
            .filter(item -> item.id().equals(lessonId))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Lesson not found"));
        requireTeacherAccess(teacherEmail, lesson.disciplineId());
        academicRepository.listAttendance().stream()
            .filter(item -> item.lessonId().equals(lessonId))
            .filter(item -> item.status().equals("PENDING"))
            .forEach(item -> academicRepository.saveAttendance(new AttendanceEntry(item.id(), item.lessonId(), item.studentId(), "VALIDATED", item.scannedAt(), Instant.now().toString())));
        return academicRepository.listAttendance().stream().filter(item -> item.lessonId().equals(lessonId)).toList();
    }

    private void requireTeacherAccess(String email, String disciplineId) {
        UserAccount user = current(email);
        if (user.roles().contains("ADMIN")) {
            return;
        }
        DisciplineSummary discipline = academicRepository.findDiscipline(disciplineId).orElseThrow(() -> new IllegalArgumentException("Discipline not found"));
        if (!user.roles().contains("PROFESSOR") || !discipline.teacherIds().contains(user.id())) {
            throw new SecurityException("Teacher access denied");
        }
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

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}
