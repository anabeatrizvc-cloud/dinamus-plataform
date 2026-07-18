package com.dinamus.adapters.in.web;

import com.dinamus.adapters.in.web.dto.EventDtos;
import com.dinamus.application.usecases.ManageEventsUseCase;
import com.dinamus.domain.model.EventSummary;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Delete;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.micronaut.http.annotation.Put;
import io.micronaut.security.annotation.Secured;
import io.micronaut.serde.annotation.Serdeable;
import io.micronaut.validation.Validated;
import jakarta.validation.Valid;

import java.security.Principal;
import java.util.List;

@Validated
@Controller("/api/v1/admin")
@Secured("ADMIN")
public class AdminController {
    private final ManageEventsUseCase manageEvents;

    public AdminController(ManageEventsUseCase manageEvents) {
        this.manageEvents = manageEvents;
    }

    @Get("/dashboard")
    public AdminDashboard dashboard(Principal principal) {
        return new AdminDashboard(principal.getName(), List.of(
            new Metric("members", 128),
            new Metric("events", 2),
            new Metric("growthGroups", 14),
            new Metric("volunteers", 42)
        ));
    }

    @Get("/events")
    public List<EventSummary> events() {
        return manageEvents.list();
    }

    @Post("/events")
    public EventSummary createEvent(@Valid @Body EventDtos.EventRequest request) {
        return manageEvents.create(request.name(), request.startsAt(), request.endsAt(), request.registrationUrl());
    }

    @Put("/events/{id}")
    public EventSummary updateEvent(@PathVariable String id, @Valid @Body EventDtos.EventRequest request) {
        return manageEvents.update(id, request.name(), request.startsAt(), request.endsAt(), request.registrationUrl());
    }

    @Delete("/events/{id}")
    public HttpResponse<?> deleteEvent(@PathVariable String id) {
        manageEvents.delete(id);
        return HttpResponse.noContent();
    }

    @Serdeable
    public record AdminDashboard(String actor, List<Metric> metrics) {
    }

    @Serdeable
    public record Metric(String key, int value) {
    }
}
