package com.dinamus.adapters.in.web;

import com.dinamus.adapters.in.web.dto.EcoDtos;
import com.dinamus.adapters.in.web.dto.EventDtos;
import com.dinamus.application.usecases.ManageEcoAttendanceUseCase;
import com.dinamus.application.usecases.ManageEventsUseCase;
import com.dinamus.domain.model.EcoAttendance;
import com.dinamus.domain.model.EcoLesson;
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
    private final ManageEcoAttendanceUseCase manageEcoAttendance;

    public AdminController(ManageEventsUseCase manageEvents, ManageEcoAttendanceUseCase manageEcoAttendance) {
        this.manageEvents = manageEvents;
        this.manageEcoAttendance = manageEcoAttendance;
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

    @Get("/eco/lessons")
    public List<EcoLesson> ecoLessons() {
        return manageEcoAttendance.listLessons();
    }

    @Get("/eco/lessons/{lessonId}/attendances")
    public List<EcoAttendance> ecoAttendances(@PathVariable String lessonId) {
        return manageEcoAttendance.listAttendances(lessonId);
    }

    @Get("/eco/lessons/{lessonId}/attendances.csv")
    public HttpResponse<String> ecoAttendancesCsv(@PathVariable String lessonId) {
        String csv = manageEcoAttendance.lessonAttendanceCsv(lessonId);
        return HttpResponse.ok(csv)
            .header("Content-Type", "text/csv; charset=utf-8")
            .header("Content-Disposition", "attachment; filename=\"eco-" + lessonId + "-presencas.csv\"");
    }

    @Get("/eco/students-summary.csv")
    public HttpResponse<String> ecoStudentsSummaryCsv() {
        return HttpResponse.ok(manageEcoAttendance.studentSummaryCsv())
            .header("Content-Type", "text/csv; charset=utf-8")
            .header("Content-Disposition", "attachment; filename=\"eco-resumo-geral.csv\"");
    }

    @Post("/eco/lessons/{lessonId}/attendances/validate-all")
    public List<EcoAttendance> validateAllEcoAttendances(@PathVariable String lessonId) {
        return manageEcoAttendance.validateAll(lessonId);
    }

    @Post("/eco/lessons/{lessonId}/attendances/purge-photos")
    public EcoDtos.EcoMaintenanceResponse purgeEcoPhotos(@PathVariable String lessonId) {
        return new EcoDtos.EcoMaintenanceResponse(manageEcoAttendance.purgeReviewedPhotos(lessonId));
    }

    @Put("/eco/lessons/{lessonId}/attendances/{attendanceId}/validation")
    public EcoAttendance validateEcoAttendance(
        @PathVariable String lessonId,
        @PathVariable String attendanceId,
        @Valid @Body EcoDtos.EcoValidationRequest request
    ) {
        return manageEcoAttendance.validate(lessonId, attendanceId, request.validated());
    }

    @Serdeable
    public record AdminDashboard(String actor, List<Metric> metrics) {
    }

    @Serdeable
    public record Metric(String key, int value) {
    }
}
