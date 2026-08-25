package com.dinamus.adapters.in.web;

import com.dinamus.adapters.in.web.dto.CareDtos;
import com.dinamus.adapters.in.web.dto.EcoDtos;
import com.dinamus.application.usecases.ListPublicContentUseCase;
import com.dinamus.application.usecases.ManageEcoAttendanceUseCase;
import com.dinamus.application.usecases.RegisterCareRequestsUseCase;
import com.dinamus.domain.model.AgendaItem;
import com.dinamus.domain.model.EcoAttendance;
import com.dinamus.domain.model.EcoLesson;
import com.dinamus.domain.model.EventSummary;
import com.dinamus.domain.model.FirstVisit;
import com.dinamus.domain.model.GrowthGroup;
import com.dinamus.domain.model.PrayerRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.Post;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;
import io.micronaut.validation.Validated;
import jakarta.validation.Valid;

import java.util.List;

@Validated
@Controller("/api/v1")
@Secured(SecurityRule.IS_ANONYMOUS)
public class PublicContentController {
    private final ListPublicContentUseCase listPublicContent;
    private final RegisterCareRequestsUseCase registerCareRequests;
    private final ManageEcoAttendanceUseCase manageEcoAttendance;

    public PublicContentController(
        ListPublicContentUseCase listPublicContent,
        RegisterCareRequestsUseCase registerCareRequests,
        ManageEcoAttendanceUseCase manageEcoAttendance
    ) {
        this.listPublicContent = listPublicContent;
        this.registerCareRequests = registerCareRequests;
        this.manageEcoAttendance = manageEcoAttendance;
    }

    @Get("/agenda")
    public List<AgendaItem> agenda() {
        return listPublicContent.agenda();
    }

    @Get("/events")
    public List<EventSummary> events() {
        return listPublicContent.events();
    }

    @Get("/growth-groups")
    public List<GrowthGroup> growthGroups() {
        return listPublicContent.growthGroups();
    }

    @Get("/eco/lesson")
    public EcoLesson ecoLesson() {
        return manageEcoAttendance.publicLesson();
    }

    @Post("/eco/attendance")
    public HttpResponse<EcoAttendance> ecoAttendance(@Valid @Body EcoDtos.EcoAttendanceRequest request) {
        EcoAttendance saved = manageEcoAttendance.register(request.name(), request.phone(), request.lessonDate(), request.photoDataUrl());
        return HttpResponse.created(saved);
    }

    @Post("/prayer-requests")
    public HttpResponse<CareDtos.AcceptedResponse> prayer(@Valid @Body CareDtos.PrayerRequestDto request) {
        PrayerRequest saved = registerCareRequests.prayer(request.name(), request.phone(), request.message());
        return HttpResponse.accepted().body(new CareDtos.AcceptedResponse(saved.id(), saved.status()));
    }

    @Post("/first-visits")
    public HttpResponse<CareDtos.AcceptedResponse> firstVisit(@Valid @Body CareDtos.FirstVisitRequestDto request) {
        FirstVisit saved = registerCareRequests.firstVisit(request.name(), request.phone(), request.email(), request.visitDate());
        return HttpResponse.accepted().body(new CareDtos.AcceptedResponse(saved.id(), saved.status()));
    }
}
