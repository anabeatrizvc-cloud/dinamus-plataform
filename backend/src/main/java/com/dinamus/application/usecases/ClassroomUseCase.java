package com.dinamus.application.usecases;

import com.dinamus.application.ports.AcademicRepository;
import com.dinamus.application.ports.IdentityRepository;
import com.dinamus.domain.model.AttendanceSession;
import com.dinamus.domain.model.AttendanceSessionProjection;
import com.dinamus.domain.model.AttendanceEntry;
import com.dinamus.domain.model.ClassroomDashboard;
import com.dinamus.domain.model.CourseSummary;
import com.dinamus.domain.model.DisciplineSummary;
import com.dinamus.domain.model.DisciplineWorkspace;
import com.dinamus.domain.model.EnrollmentSummary;
import com.dinamus.domain.model.LessonSummary;
import com.dinamus.domain.model.MemberAccount;
import com.dinamus.domain.model.MemberSummary;
import com.dinamus.domain.model.UserAccount;
import jakarta.inject.Singleton;

import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Singleton
public class ClassroomUseCase {
    private final AcademicRepository academicRepository;
    private final IdentityRepository identityRepository;

    public ClassroomUseCase(AcademicRepository academicRepository, IdentityRepository identityRepository) {
        this.academicRepository = academicRepository;
        this.identityRepository = identityRepository;
    }

    public ClassroomDashboard dashboard(String email) {
        UserAccount user = current(email);
        List<DisciplineSummary> enrolledDisciplines = academicRepository.listEnrollments().stream()
            .filter(item -> item.studentId().equals(user.id()))
            .map(EnrollmentSummary::disciplineId)
            .flatMap(disciplineId -> academicRepository.findDiscipline(disciplineId).stream())
            .toList();
        List<String> enrolledCourseIds = enrolledDisciplines.stream()
            .map(DisciplineSummary::courseId)
            .distinct()
            .toList();
        List<CourseSummary> courses = academicRepository.listCourses().stream()
            .filter(course -> user.roles().contains("ADMIN") || enrolledCourseIds.contains(course.id()))
            .toList();
        List<DisciplineSummary> teaching = academicRepository.listDisciplines().stream()
            .filter(discipline -> user.roles().contains("ADMIN") || discipline.teacherIds().contains(user.id()))
            .toList();
        return new ClassroomDashboard(courses, enrolledDisciplines, teaching);
    }

    public DisciplineWorkspace discipline(String email, String disciplineId) {
        UserAccount user = current(email);
        DisciplineSummary discipline = academicRepository.findDiscipline(disciplineId).orElseThrow(() -> new IllegalArgumentException("Discipline not found"));
        CourseSummary course = academicRepository.findCourse(discipline.courseId()).orElseThrow(() -> new IllegalArgumentException("Course not found"));
        if (!canAccessDiscipline(user, discipline)) {
            throw new SecurityException("Discipline access denied");
        }
        List<String> studentIds = academicRepository.listEnrollments().stream()
            .filter(item -> item.disciplineId().equals(disciplineId))
            .map(EnrollmentSummary::studentId)
            .toList();
        List<MemberSummary> students = identityRepository.listMembers().stream()
            .filter(member -> studentIds.contains(member.id()))
            .map(member -> new MemberSummary(member.id(), member.name(), member.phone(), member.email(), member.roles(), member.active(), false, ""))
            .toList();
        return new DisciplineWorkspace(
            course,
            discipline,
            students,
            academicRepository.listLessons().stream().filter(item -> item.disciplineId().equals(disciplineId)).toList(),
            academicRepository.listMaterials().stream().filter(item -> item.disciplineId().equals(disciplineId)).toList(),
            academicRepository.listRecordings().stream()
                .filter(item -> item.disciplineId().equals(disciplineId))
                .filter(item -> user.roles().contains("ADMIN") || discipline.teacherIds().contains(user.id()) || item.visibleToStudents())
                .toList(),
            academicRepository.listActivities().stream().filter(item -> item.disciplineId().equals(disciplineId) && (user.roles().contains("ADMIN") || discipline.teacherIds().contains(user.id()) || item.status().equals("PUBLISHED"))).toList(),
            academicRepository.listEvaluations().stream().filter(item -> item.disciplineId().equals(disciplineId)).toList(),
            academicRepository.listGrades(),
            academicRepository.listAttendance(),
            academicRepository.listAttendanceAudits()
        );
    }

    public AttendanceEntry scanAttendance(String email, String token) {
        UserAccount user = current(email);
        AttendanceSession session = academicRepository.listAttendanceSessions().stream()
            .filter(item -> item.tokenHash().equals(hash(token)))
            .filter(item -> item.status().equals("OPEN"))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Invalid attendance token"));
        if (!session.expiresAt().isBlank() && Instant.parse(session.expiresAt()).isBefore(Instant.now())) {
            throw new IllegalArgumentException("Attendance token expired");
        }
        LessonSummary lesson = academicRepository.listLessons().stream()
            .filter(item -> item.id().equals(session.lessonId()))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Lesson not found"));
        boolean enrolled = academicRepository.listEnrollments().stream()
            .anyMatch(item -> item.disciplineId().equals(lesson.disciplineId()) && item.studentId().equals(user.id()) && item.status().equals("ACTIVE"));
        if (!enrolled) {
            throw new SecurityException("Student is not enrolled in this discipline");
        }
        return academicRepository.listAttendance().stream()
            .filter(item -> item.lessonId().equals(lesson.id()) && item.studentId().equals(user.id()))
            .findFirst()
            .orElseGet(() -> academicRepository.saveAttendance(new AttendanceEntry(UUID.randomUUID().toString(), lesson.id(), user.id(), "PENDING_VALIDATION", Instant.now().toString(), "")));
    }

    public AttendanceSessionProjection projectedSession(String publicCodeOrToken) {
        String tokenHash = hash(publicCodeOrToken);
        AttendanceSession session = academicRepository.listAttendanceSessions().stream()
            .filter(item -> item.publicCode().equalsIgnoreCase(publicCodeOrToken) || item.tokenHash().equals(tokenHash))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Attendance session not found"));
        LessonSummary lesson = academicRepository.listLessons().stream()
            .filter(item -> item.id().equals(session.lessonId()))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Lesson not found"));
        DisciplineSummary discipline = academicRepository.findDiscipline(lesson.disciplineId()).orElseThrow(() -> new IllegalArgumentException("Discipline not found"));
        CourseSummary course = academicRepository.findCourse(discipline.courseId()).orElseThrow(() -> new IllegalArgumentException("Course not found"));
        int expectedCount = (int) academicRepository.listEnrollments().stream()
            .filter(item -> item.disciplineId().equals(discipline.id()) && item.status().equals("ACTIVE"))
            .count();
        int registeredCount = (int) academicRepository.listAttendance().stream()
            .filter(item -> item.lessonId().equals(lesson.id()))
            .count();
        String status = session.status();
        if (status.equals("OPEN") && !session.expiresAt().isBlank() && Instant.parse(session.expiresAt()).isBefore(Instant.now())) {
            status = "EXPIRED";
        }
        return new AttendanceSessionProjection(session.publicCode(), course.title(), discipline.title(), lesson.title(), lesson.lessonDate(), status, session.expiresAt(), registeredCount, expectedCount);
    }

    private boolean canAccessDiscipline(UserAccount user, DisciplineSummary discipline) {
        if (user.roles().contains("ADMIN") || discipline.teacherIds().contains(user.id())) {
            return true;
        }
        return academicRepository.listEnrollments().stream()
            .anyMatch(item -> item.disciplineId().equals(discipline.id()) && item.studentId().equals(user.id()));
    }

    private UserAccount current(String email) {
        return identityRepository.findUserByEmail(email)
            .or(() -> identityRepository.findMemberById(email).map(MemberAccount::toUserAccount))
            .orElseThrow(() -> new SecurityException("User not found"));
    }

    private String hash(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes()));
        } catch (Exception exception) {
            throw new IllegalStateException("Could not hash token", exception);
        }
    }
}
