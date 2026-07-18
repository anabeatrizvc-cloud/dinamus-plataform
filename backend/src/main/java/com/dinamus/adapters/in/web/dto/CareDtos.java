package com.dinamus.adapters.in.web.dto;

import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public final class CareDtos {
    private CareDtos() {
    }

    @Serdeable
    public record PrayerRequestDto(@NotBlank @Size(min = 2) String name, @NotBlank @Size(min = 8) String phone, @NotBlank @Size(min = 12) String message) {
    }

    @Serdeable
    public record FirstVisitRequestDto(@NotBlank @Size(min = 2) String name, @NotBlank @Size(min = 8) String phone, @Email String email, @NotNull LocalDate visitDate) {
    }

    @Serdeable
    public record AcceptedResponse(String id, String status) {
    }
}
