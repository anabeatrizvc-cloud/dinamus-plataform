package com.dinamus.adapters.in.web.dto;

import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public final class MemberDtos {
    private MemberDtos() {
    }

    @Serdeable
    public record MemberRequest(
        @NotBlank @Size(min = 3) String name,
        @NotBlank String phone,
        @Email String email,
        List<String> roles,
        boolean active
    ) {
    }
}
