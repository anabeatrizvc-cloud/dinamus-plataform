package com.dinamus;

import com.dinamus.adapters.in.web.AdminController;
import com.dinamus.adapters.in.web.dto.AuthDtos;
import com.dinamus.domain.model.AgendaItem;
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
        return client.toBlocking().retrieve(
            HttpRequest.POST("/api/v1/auth/login", Map.of("email", "admin@dinamus.local", "password", "dnms-admin")),
            AuthDtos.LoginResponse.class
        );
    }
}
