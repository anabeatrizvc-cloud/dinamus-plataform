package com.dinamus.application.usecases;

import com.dinamus.application.ports.ContentRepository;
import com.dinamus.domain.model.EventSummary;
import jakarta.inject.Singleton;

import java.util.List;
import java.util.UUID;

@Singleton
public class ManageEventsUseCase {
    private final ContentRepository repository;

    public ManageEventsUseCase(ContentRepository repository) {
        this.repository = repository;
    }

    public List<EventSummary> list() {
        return repository.listEvents();
    }

    public EventSummary create(String name, String startsAt, String endsAt, String registrationUrl) {
        return repository.saveEvent(new EventSummary(UUID.randomUUID().toString(), name, startsAt, normalize(endsAt), registrationUrl));
    }

    public EventSummary update(String id, String name, String startsAt, String endsAt, String registrationUrl) {
        return repository.saveEvent(new EventSummary(id, name, startsAt, normalize(endsAt), registrationUrl));
    }

    public void delete(String id) {
        repository.deleteEvent(id);
    }

    private String normalize(String value) {
        return value == null ? "" : value;
    }
}
