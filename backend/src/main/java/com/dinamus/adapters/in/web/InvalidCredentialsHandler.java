package com.dinamus.adapters.in.web;

import com.dinamus.application.usecases.AuthenticationUseCase;
import io.micronaut.context.annotation.Requires;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.annotation.Produces;
import io.micronaut.http.server.exceptions.ExceptionHandler;
import jakarta.inject.Singleton;

@Produces
@Singleton
@Requires(classes = {AuthenticationUseCase.InvalidCredentialsException.class, ExceptionHandler.class})
public class InvalidCredentialsHandler implements ExceptionHandler<AuthenticationUseCase.InvalidCredentialsException, HttpResponse<?>> {
    @Override
    public HttpResponse<?> handle(HttpRequest request, AuthenticationUseCase.InvalidCredentialsException exception) {
        return HttpResponse.unauthorized();
    }
}
