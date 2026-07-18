package com.dinamus.adapters.in.web.dto;

import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class EventDtos {
    private EventDtos() {
    }

    @Serdeable
    public record EventRequest(
        @NotBlank @Size(min = 3) String name,
        @NotBlank String startsAt,
        String endsAt,
        @NotBlank String registrationUrl
    ) {
    }
}
