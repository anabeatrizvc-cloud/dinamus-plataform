package com.dinamus.adapters.in.web;

import com.dinamus.domain.model.MissionBaseConflictException;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.annotation.Produces;
import io.micronaut.http.server.exceptions.ExceptionHandler;
import jakarta.inject.Singleton;
import java.util.Map;

@Produces
@Singleton
public class MissionBaseConflictHandler implements ExceptionHandler<MissionBaseConflictException, HttpResponse<BadRequestHandler.ApiError>> {
    @Override
    public HttpResponse<BadRequestHandler.ApiError> handle(HttpRequest request, MissionBaseConflictException exception) {
        return HttpResponse.<BadRequestHandler.ApiError>status(io.micronaut.http.HttpStatus.CONFLICT)
            .body(new BadRequestHandler.ApiError("STALE_VERSION", exception.getMessage(), Map.of()));
    }
}
