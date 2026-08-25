package com.dinamus.adapters.in.web;

import io.micronaut.context.annotation.Requires;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.annotation.Produces;
import io.micronaut.http.server.exceptions.ExceptionHandler;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.inject.Singleton;

import java.util.Map;

@Produces
@Singleton
@Requires(classes = {IllegalArgumentException.class, ExceptionHandler.class})
public class BadRequestHandler implements ExceptionHandler<IllegalArgumentException, HttpResponse<BadRequestHandler.ApiError>> {
    @Override
    public HttpResponse<ApiError> handle(HttpRequest request, IllegalArgumentException exception) {
        return HttpResponse.badRequest(new ApiError(code(exception.getMessage()), exception.getMessage(), Map.of()));
    }

    @Serdeable
    public record ApiError(String code, String message, Map<String, Object> details) {
    }

    private String code(String message) {
        if (message == null) {
            return "VALIDATION_ERROR";
        }
        String normalized = message.toLowerCase();
        if (normalized.contains("already") || normalized.contains("ja esta")) {
            return "DUPLICATE_RESOURCE";
        }
        return "VALIDATION_ERROR";
    }
}
