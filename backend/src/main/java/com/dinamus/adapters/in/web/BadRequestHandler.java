package com.dinamus.adapters.in.web;

import io.micronaut.context.annotation.Requires;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.annotation.Produces;
import io.micronaut.http.server.exceptions.ExceptionHandler;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.inject.Singleton;

@Produces
@Singleton
@Requires(classes = {IllegalArgumentException.class, ExceptionHandler.class})
public class BadRequestHandler implements ExceptionHandler<IllegalArgumentException, HttpResponse<BadRequestHandler.ApiError>> {
    @Override
    public HttpResponse<ApiError> handle(HttpRequest request, IllegalArgumentException exception) {
        return HttpResponse.badRequest(new ApiError(exception.getMessage()));
    }

    @Serdeable
    public record ApiError(String message) {
    }
}
