package com.dinamus.application.usecases;

import com.dinamus.application.ports.AcademicRepository;
import com.dinamus.application.ports.IdentityRepository;
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

import java.time.Instant;
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
            academicRepository.listEvaluations().stream().filter(item -> item.disciplineId().equals(disciplineId)).toList(),
            academicRepository.listGrades(),
            academicRepository.listAttendance()
        );
    }

    public AttendanceEntry scanAttendance(String email, String token) {
        UserAccount user = current(email);
        LessonSummary lesson = academicRepository.listLessons().stream()
            .filter(item -> item.attendanceToken().equals(token))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Invalid attendance token"));
        if (!lesson.attendanceTokenExpiresAt().isBlank() && Instant.parse(lesson.attendanceTokenExpiresAt()).isBefore(Instant.now())) {
            throw new IllegalArgumentException("Attendance token expired");
        }
        boolean enrolled = academicRepository.listEnrollments().stream()
            .anyMatch(item -> item.disciplineId().equals(lesson.disciplineId()) && item.studentId().equals(user.id()));
        if (!enrolled) {
            throw new SecurityException("Student is not enrolled in this discipline");
        }
        return academicRepository.listAttendance().stream()
            .filter(item -> item.lessonId().equals(lesson.id()) && item.studentId().equals(user.id()))
            .findFirst()
            .map(current -> academicRepository.saveAttendance(new AttendanceEntry(current.id(), current.lessonId(), current.studentId(), "PENDING", Instant.now().toString(), "")))
            .orElseGet(() -> academicRepository.saveAttendance(new AttendanceEntry(UUID.randomUUID().toString(), lesson.id(), user.id(), "PENDING", Instant.now().toString(), "")));
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
}
