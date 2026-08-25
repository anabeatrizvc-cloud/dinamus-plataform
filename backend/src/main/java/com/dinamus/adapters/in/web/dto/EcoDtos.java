package com.dinamus.adapters.in.web.dto;

import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class EcoDtos {
    private EcoDtos() {
    }

    @Serdeable
    public record EcoAttendanceRequest(
        @NotBlank @Size(min = 3, max = 90) String name,
        @NotBlank @Size(min = 10, max = 20) String phone,
        @NotBlank @Pattern(regexp = "2026-08-25") String lessonDate,
        @NotBlank @Size(min = 120, max = 1_500_000) String photoDataUrl
    ) {
    }

    @Serdeable
    public record EcoValidationRequest(@NotNull Boolean validated) {
    }
}
