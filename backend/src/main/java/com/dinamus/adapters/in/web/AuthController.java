package com.dinamus.adapters.in.web;

import com.dinamus.adapters.in.web.dto.AuthDtos;
import com.dinamus.application.usecases.AuthenticationUseCase;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Post;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;
import io.micronaut.validation.Validated;
import jakarta.validation.Valid;

@Validated
@Controller("/api/v1/auth")
@Secured(SecurityRule.IS_ANONYMOUS)
public class AuthController {
    private final AuthenticationUseCase useCase;

    public AuthController(AuthenticationUseCase useCase) {
        this.useCase = useCase;
    }

    @Post("/login")
    public HttpResponse<AuthDtos.LoginResponse> login(@Valid @Body AuthDtos.LoginRequest request) {
        AuthenticationUseCase.AuthResult result = useCase.login(request.email(), request.password());
        return HttpResponse.ok(new AuthDtos.LoginResponse(
            result.accessToken(),
            result.refreshToken(),
            new AuthDtos.UserDto(result.user().id(), result.user().name(), result.user().email(), result.user().roles())
        ));
    }
}
