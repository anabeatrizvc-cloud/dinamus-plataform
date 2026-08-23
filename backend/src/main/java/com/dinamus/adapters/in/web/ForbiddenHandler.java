package com.dinamus.adapters.in.web;

import io.micronaut.context.annotation.Requires;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.annotation.Produces;
import io.micronaut.http.server.exceptions.ExceptionHandler;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.inject.Singleton;

import java.util.Map;

@Produces
@Singleton
@Requires(classes = {SecurityException.class, ExceptionHandler.class})
public class ForbiddenHandler implements ExceptionHandler<SecurityException, HttpResponse<ForbiddenHandler.ApiError>> {
    @Override
    public HttpResponse<ApiError> handle(HttpRequest request, SecurityException exception) {
        return HttpResponse.status(HttpStatus.FORBIDDEN).body(new ApiError("FORBIDDEN", exception.getMessage(), Map.of()));
    }

    @Serdeable
    public record ApiError(String code, String message, Map<String, Object> details) {
    }
}
