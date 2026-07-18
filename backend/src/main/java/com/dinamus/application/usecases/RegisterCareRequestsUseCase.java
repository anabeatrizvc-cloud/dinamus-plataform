package com.dinamus.application.usecases;

import com.dinamus.application.ports.AuditPort;
import com.dinamus.application.ports.ContentRepository;
import com.dinamus.domain.model.FirstVisit;
import com.dinamus.domain.model.PrayerRequest;
import jakarta.inject.Singleton;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Singleton
public class RegisterCareRequestsUseCase {
    private final ContentRepository repository;
    private final AuditPort auditPort;

    public RegisterCareRequestsUseCase(ContentRepository repository, AuditPort auditPort) {
        this.repository = repository;
        this.auditPort = auditPort;
    }

    public PrayerRequest prayer(String name, String phone, String message) {
        PrayerRequest request = new PrayerRequest(UUID.randomUUID().toString(), name, phone, message, Instant.now(), "received");
        PrayerRequest saved = repository.savePrayerRequest(request);
        auditPort.record("public", "prayer-request.created", saved.id());
        return saved;
    }

    public FirstVisit firstVisit(String name, String phone, String email, LocalDate visitDate) {
        FirstVisit visit = new FirstVisit(UUID.randomUUID().toString(), name, phone, email, visitDate, Instant.now(), "received");
        FirstVisit saved = repository.saveFirstVisit(visit);
        auditPort.record("public", "first-visit.created", saved.id());
        return saved;
    }
}
