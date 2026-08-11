package com.dinamus.adapters.in.web.dto;

import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public final class AuthDtos {
    private AuthDtos() {
    }

    @Serdeable
    public record LoginRequest(@Email String email, @NotBlank @Size(min = 8) String password) {
    }

    @Serdeable
    public record SetupPasswordRequest(@NotBlank String token, @NotBlank @Size(min = 8) String password) {
    }

    @Serdeable
    public record LoginResponse(String accessToken, String refreshToken, UserDto user) {
    }

    @Serdeable
    public record UserDto(String id, String name, String email, List<String> roles) {
    }
}
