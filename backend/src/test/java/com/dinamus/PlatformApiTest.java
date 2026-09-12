package com.dinamus;

import com.dinamus.adapters.in.web.AdminController;
import com.dinamus.adapters.in.web.dto.AuthDtos;
import com.dinamus.adapters.in.web.dto.EcoDtos;
import com.dinamus.adapters.in.web.dto.MissionBaseDtos;
import com.dinamus.domain.model.AgendaItem;
import com.dinamus.domain.model.EcoAttendance;
import com.dinamus.domain.model.EcoLesson;
import com.dinamus.domain.model.EventSummary;
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

import java.util.Base64;
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
    void publicEcoAttendanceCanBeRegisteredAndValidatedByAdmin() {
        EcoLesson lesson = client.toBlocking().retrieve(HttpRequest.GET("/api/v1/eco/lesson"), EcoLesson.class);
        assertEquals("eco-2026-09-08", lesson.id());
        assertEquals("2026-09-08", lesson.lessonDate());

        EcoAttendance created = client.toBlocking().retrieve(
            HttpRequest.POST("/api/v1/eco/attendance", Map.of(
                "name", "Aluno Eco",
                "phone", "(81) 99949-9159",
                "lessonDate", "2026-09-08",
                "photoDataUrl", samplePhoto()
            )),
            EcoAttendance.class
        );

        assertEquals("PENDING", created.status());
        assertEquals("(81) 99949-9159", created.phone());

        AuthDtos.LoginResponse admin = login();
        List<EcoLesson> lessons = client.toBlocking().retrieve(
            HttpRequest.GET("/api/v1/admin/eco/lessons").bearerAuth(admin.accessToken()),
            Argument.listOf(EcoLesson.class)
        );
        assertFalse(lessons.isEmpty());
        assertTrue(lessons.stream().anyMatch(item -> item.id().equals("eco-2026-08-25")));
        assertTrue(lessons.stream().anyMatch(item -> item.id().equals("eco-2026-09-01")));
        assertTrue(lessons.stream().anyMatch(item -> item.id().equals("eco-2026-09-08")));

        List<EcoAttendance> attendances = client.toBlocking().retrieve(
            HttpRequest.GET("/api/v1/admin/eco/lessons/" + lesson.id() + "/attendances").bearerAuth(admin.accessToken()),
            Argument.listOf(EcoAttendance.class)
        );
        assertTrue(attendances.stream().anyMatch(attendance -> attendance.id().equals(created.id())));

        EcoAttendance validated = client.toBlocking().retrieve(
            HttpRequest.PUT(
                "/api/v1/admin/eco/lessons/" + lesson.id() + "/attendances/" + created.id() + "/validation",
                Map.of("validated", true)
            ).bearerAuth(admin.accessToken()),
            EcoAttendance.class
        );

        assertEquals("VALIDATED", validated.status());
        assertFalse(validated.validatedAt().isBlank());
        assertTrue(validated.photoDataUrl() == null || validated.photoDataUrl().isBlank());

        EcoDtos.EcoStudentSuggestionResponse suggestion = client.toBlocking().retrieve(
            HttpRequest.GET("/api/v1/eco/students/lookup?phone=81999499159"),
            EcoDtos.EcoStudentSuggestionResponse.class
        );

        assertEquals("Aluno Eco", suggestion.name());

        String csv = client.toBlocking().retrieve(
            HttpRequest.GET("/api/v1/admin/eco/lessons/" + lesson.id() + "/attendances.csv").bearerAuth(admin.accessToken()),
            String.class
        );

        assertTrue(csv.contains("Aluno Eco"));
        assertFalse(csv.contains("data:image"));
    }

    @Test
    void adminCanValidateAllEcoAttendancesAndExportStudentSummary() {
        EcoLesson lesson = client.toBlocking().retrieve(HttpRequest.GET("/api/v1/eco/lesson"), EcoLesson.class);
        client.toBlocking().retrieve(
            HttpRequest.POST("/api/v1/eco/attendance", Map.of(
                "name", "Aluno Lote Eco",
                "phone", "81999887766",
                "lessonDate", lesson.lessonDate(),
                "photoDataUrl", samplePhoto()
            )),
            EcoAttendance.class
        );

        AuthDtos.LoginResponse admin = login();
        List<EcoAttendance> validated = client.toBlocking().retrieve(
            HttpRequest.POST("/api/v1/admin/eco/lessons/" + lesson.id() + "/attendances/validate-all", Map.of()).bearerAuth(admin.accessToken()),
            Argument.listOf(EcoAttendance.class)
        );

        assertTrue(validated.stream().anyMatch(attendance -> attendance.name().equals("Aluno Lote Eco") && attendance.status().equals("VALIDATED")));

        String summary = client.toBlocking().retrieve(
            HttpRequest.GET("/api/v1/admin/eco/students-summary.csv").bearerAuth(admin.accessToken()),
            String.class
        );

        assertTrue(summary.contains("Aluno Lote Eco"));
        assertTrue(summary.contains("\"3\""));
    }

    @Test
    void ecoAttendanceRequiresBrazilianMobilePhone() {
        HttpClientResponseException exception = assertThrows(HttpClientResponseException.class, () ->
            client.toBlocking().exchange(HttpRequest.POST("/api/v1/eco/attendance", Map.of(
                "name", "Aluno Eco",
                "phone", "8133344444",
                "lessonDate", "2026-09-08",
                "photoDataUrl", samplePhoto()
            )))
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
    }

    @Test
    void adminDashboardRequiresToken() {
        HttpClientResponseException exception = assertThrows(HttpClientResponseException.class, () ->
            client.toBlocking().exchange(HttpRequest.GET("/api/v1/admin/dashboard"), String.class)
        );

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatus());
    }

    @Test
    void missionBasePixDoesNotChangeProgressAndAdminCanResetRaisedValues() {
        MissionBaseDtos.CampaignResponse publicCampaign = client.toBlocking().retrieve(
            HttpRequest.GET("/api/v1/mission-base"),
            MissionBaseDtos.CampaignResponse.class
        );
        assertEquals(3, publicCampaign.stages().size());
        assertEquals(0, publicCampaign.percent());

        MissionBaseDtos.PixResponse pix = client.toBlocking().retrieve(
            HttpRequest.POST("/api/v1/mission-base/pix", Map.of("stageId", "aquisicao", "amountCents", 10000)),
            MissionBaseDtos.PixResponse.class
        );

        assertEquals("aquisicao", pix.stageId());
        assertEquals(10000, pix.amountCents());
        assertTrue(pix.txid().length() <= 35);
        assertTrue(pix.pixPayload().startsWith("000201"));
        assertTrue(pix.pixPayload().contains("52040000"));

        MissionBaseDtos.CampaignResponse afterPix = client.toBlocking().retrieve(
            HttpRequest.GET("/api/v1/mission-base"),
            MissionBaseDtos.CampaignResponse.class
        );
        assertEquals(publicCampaign.totalRaisedCents(), afterPix.totalRaisedCents());

        HttpClientResponseException invalidAmount = assertThrows(HttpClientResponseException.class, () ->
            client.toBlocking().exchange(HttpRequest.POST("/api/v1/mission-base/pix", Map.of("stageId", "aquisicao", "amountCents", 0)), String.class)
        );
        assertEquals(HttpStatus.BAD_REQUEST, invalidAmount.getStatus());

        AuthDtos.LoginResponse admin = login();
        MissionBaseDtos.CampaignResponse updated = client.toBlocking().retrieve(
            HttpRequest.PUT("/api/v1/admin/mission-base", Map.of(
                "title", "Um lugar para o avanço do Reino.",
                "description", "Campanha administrada pela igreja para acompanhar cada etapa da Base Missionária.",
                "active", true,
                "currentStageId", "reforma",
                "stages", List.of(
                    Map.of("id", "aquisicao", "goalCents", 10000, "raisedCents", 15000, "status", "CONCLUIDA", "visible", true),
                    Map.of("id", "reforma", "goalCents", 0, "raisedCents", 0, "status", "EM_ANDAMENTO", "visible", true),
                    Map.of("id", "construcao", "goalCents", 30000, "raisedCents", 0, "status", "EM_BREVE", "visible", true)
                )
            )).bearerAuth(admin.accessToken()),
            MissionBaseDtos.CampaignResponse.class
        );

        assertEquals(15000, updated.totalRaisedCents());
        assertEquals(40000, updated.totalGoalCents());
        assertEquals(38, updated.percent());
        assertTrue(updated.stages().stream().anyMatch(stage -> stage.id().equals("aquisicao") && stage.percent() == 100 && stage.goalExceeded()));
        assertTrue(updated.stages().stream().anyMatch(stage -> stage.id().equals("reforma") && stage.percent() == 0 && stage.current()));

        MissionBaseDtos.CampaignResponse reset = client.toBlocking().retrieve(
            HttpRequest.POST("/api/v1/admin/mission-base/reset", Map.of("confirmation", "ZERAR")).bearerAuth(admin.accessToken()),
            MissionBaseDtos.CampaignResponse.class
        );

        assertEquals(0, reset.totalRaisedCents());
        assertEquals(40000, reset.totalGoalCents());
        assertTrue(reset.stages().stream().allMatch(stage -> stage.raisedCents() == 0));
    }

    @Test
    void adminMissionBaseRequiresToken() {
        HttpClientResponseException exception = assertThrows(HttpClientResponseException.class, () ->
            client.toBlocking().exchange(HttpRequest.GET("/api/v1/admin/mission-base"), String.class)
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

    private String samplePhoto() {
        return "data:image/png;base64," + Base64.getEncoder().encodeToString("selfie-de-teste-com-conteudo-suficiente-para-validar-upload-do-eco".repeat(3).getBytes());
    }
}
