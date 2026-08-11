package com.dinamus;

import com.dinamus.adapters.in.web.AdminController;
import com.dinamus.adapters.in.web.dto.AuthDtos;
import com.dinamus.domain.model.AttendanceEntry;
import com.dinamus.domain.model.AgendaItem;
import com.dinamus.domain.model.ClassroomDashboard;
import com.dinamus.domain.model.CourseSummary;
import com.dinamus.domain.model.DisciplineSummary;
import com.dinamus.domain.model.EnrollmentSummary;
import com.dinamus.domain.model.EventSummary;
import com.dinamus.domain.model.LessonSummary;
import com.dinamus.domain.model.MemberSummary;
import io.micronaut.core.type.Argument;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import io.micronaut.http.client.exceptions.HttpClientResponseException;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@MicronautTest
class PlatformApiTest {
    @Inject
    @Client("/")
    HttpClient client;

    @Test
    void publicAgendaIsAvailableAnonymously() {
        List<AgendaItem> agenda = client.toBlocking().retrieve(HttpRequest.GET("/api/v1/agenda"), Argument.listOf(AgendaItem.class));

        assertFalse(agenda.isEmpty());
        assertEquals("Celebracao da familia", agenda.getFirst().title());
    }

    @Test
    void loginIssuesJwtForAdminUser() {
        AuthDtos.LoginResponse response = login();

        assertTrue(response.accessToken().length() > 40);
        assertEquals("admin@dinamus.local", response.user().email());
        assertTrue(response.user().roles().contains("ADMIN"));
    }

    @Test
    void adminCanManageEventsAndPublishThem() {
        AuthDtos.LoginResponse login = login();
        Map<String, String> payload = Map.of(
            "name", "Conferencia DNMS",
            "startsAt", "2026-10-12",
            "endsAt", "",
            "registrationUrl", "https://dinamus.recife/eventos/conferencia"
        );

        EventSummary created = client.toBlocking().retrieve(
            HttpRequest.POST("/api/v1/admin/events", payload).bearerAuth(login.accessToken()),
            EventSummary.class
        );

        assertEquals("Conferencia DNMS", created.name());
        assertEquals("2026-10-12", created.startsAt());

        EventSummary updated = client.toBlocking().retrieve(
            HttpRequest.PUT("/api/v1/admin/events/" + created.id(), Map.of(
                "name", "Conferencia DNMS Recife",
                "startsAt", "2026-10-12",
                "endsAt", "2026-10-13",
                "registrationUrl", "https://dinamus.recife/eventos/conferencia"
            )).bearerAuth(login.accessToken()),
            EventSummary.class
        );

        assertEquals("Conferencia DNMS Recife", updated.name());
        assertEquals("2026-10-13", updated.endsAt());

        List<EventSummary> publicEvents = client.toBlocking().retrieve(HttpRequest.GET("/api/v1/events"), Argument.listOf(EventSummary.class));
        assertTrue(publicEvents.stream().anyMatch(event -> event.id().equals(created.id())));

        client.toBlocking().exchange(HttpRequest.DELETE("/api/v1/admin/events/" + created.id()).bearerAuth(login.accessToken()));

        List<EventSummary> afterDelete = client.toBlocking().retrieve(HttpRequest.GET("/api/v1/admin/events").bearerAuth(login.accessToken()), Argument.listOf(EventSummary.class));
        assertFalse(afterDelete.stream().anyMatch(event -> event.id().equals(created.id())));
    }

    @Test
    void professorGeneratesQrAndStudentMarksAttendance() {
        AuthDtos.LoginResponse professor = login("professor@dinamus.local", "dnms-prof");
        AuthDtos.LoginResponse student = login("aluno@dinamus.local", "dnms-aluno");

        ClassroomDashboard professorDashboard = client.toBlocking().retrieve(
            HttpRequest.GET("/api/v1/classroom").bearerAuth(professor.accessToken()),
            ClassroomDashboard.class
        );

        String disciplineId = professorDashboard.teachingDisciplines().getFirst().id();
        LessonSummary lesson = client.toBlocking().retrieve(
            HttpRequest.POST("/api/v1/classroom/teacher/lessons", Map.of(
                "disciplineId", disciplineId,
                "title", "Aula com QR",
                "lessonDate", "2026-09-01"
            )).bearerAuth(professor.accessToken()),
            LessonSummary.class
        );

        LessonSummary withToken = client.toBlocking().retrieve(
            HttpRequest.POST("/api/v1/classroom/teacher/lessons/" + lesson.id() + "/attendance-token", Map.of()).bearerAuth(professor.accessToken()),
            LessonSummary.class
        );

        AttendanceEntry pending = client.toBlocking().retrieve(
            HttpRequest.POST("/api/v1/classroom/attendance/scan", Map.of("token", withToken.attendanceToken())).bearerAuth(student.accessToken()),
            AttendanceEntry.class
        );

        assertEquals("PENDING", pending.status());

        AttendanceEntry validated = client.toBlocking().retrieve(
            HttpRequest.POST("/api/v1/classroom/teacher/attendance/" + pending.id() + "/validate", Map.of("present", true)).bearerAuth(professor.accessToken()),
            AttendanceEntry.class
        );

        assertEquals("VALIDATED", validated.status());
    }

    @Test
    void adminCanCreateMemberInviteAndSetupPassword() {
        AuthDtos.LoginResponse admin = login();

        MemberSummary created = client.toBlocking().retrieve(
            HttpRequest.POST("/api/v1/admin/members", Map.of(
                "name", "Aluno Convidado",
                "phone", "81999993333",
                "email", "convidado@dinamus.local",
                "roles", List.of("MEMBRO"),
                "active", true
            )).bearerAuth(admin.accessToken()),
            MemberSummary.class
        );

        assertTrue(created.invitePending());

        AuthDtos.LoginResponse session = client.toBlocking().retrieve(
            HttpRequest.POST("/api/v1/auth/setup-password", Map.of(
                "token", created.setupToken(),
                "password", "senha-aluno"
            )),
            AuthDtos.LoginResponse.class
        );

        assertEquals("convidado@dinamus.local", session.user().email());
        assertTrue(session.user().roles().contains("MEMBRO"));
    }

    @Test
    void adminCanCreateCourseDisciplineAndEnrollment() {
        AuthDtos.LoginResponse admin = login();

        CourseSummary course = client.toBlocking().retrieve(
            HttpRequest.POST("/api/v1/admin/academic/courses", Map.of(
                "title", "Escola de Servico",
                "description", "Formacao para voluntarios",
                "startsAt", "2026-09-05",
                "endsAt", "",
                "status", "OPEN"
            )).bearerAuth(admin.accessToken()),
            CourseSummary.class
        );

        DisciplineSummary discipline = client.toBlocking().retrieve(
            HttpRequest.POST("/api/v1/admin/academic/disciplines", Map.of(
                "courseId", course.id(),
                "title", "Cuidado com pessoas",
                "description", "Rotina de acompanhamento",
                "teacherIds", List.of("professor-demo"),
                "maxAbsences", 2,
                "usesGrades", false
            )).bearerAuth(admin.accessToken()),
            DisciplineSummary.class
        );

        EnrollmentSummary enrollment = client.toBlocking().retrieve(
            HttpRequest.POST("/api/v1/admin/academic/enrollments", Map.of(
                "disciplineId", discipline.id(),
                "studentId", "aluno-demo"
            )).bearerAuth(admin.accessToken()),
            EnrollmentSummary.class
        );

        assertEquals("Escola de Servico", course.title());
        assertEquals("Cuidado com pessoas", discipline.title());
        assertEquals(discipline.id(), enrollment.disciplineId());
    }

    @Test
    void adminDashboardRequiresToken() {
        HttpClientResponseException exception = assertThrows(HttpClientResponseException.class, () ->
            client.toBlocking().exchange(HttpRequest.GET("/api/v1/admin/dashboard"), String.class)
        );

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatus());
    }

    @Test
    void adminDashboardAcceptsJwtToken() {
        AuthDtos.LoginResponse login = login();

        AdminController.AdminDashboard dashboard = client.toBlocking().retrieve(
            HttpRequest.GET("/api/v1/admin/dashboard").bearerAuth(login.accessToken()),
            AdminController.AdminDashboard.class
        );

        assertEquals("admin-local", dashboard.actor());
        assertFalse(dashboard.metrics().isEmpty());
    }

    private AuthDtos.LoginResponse login() {
        return login("admin@dinamus.local", "dnms-admin");
    }

    private AuthDtos.LoginResponse login(String email, String password) {
        return client.toBlocking().retrieve(
            HttpRequest.POST("/api/v1/auth/login", Map.of("email", email, "password", password)),
            AuthDtos.LoginResponse.class
        );
    }
}
