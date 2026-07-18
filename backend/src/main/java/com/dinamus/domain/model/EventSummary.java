package com.dinamus.domain.model;

import io.micronaut.serde.annotation.Serdeable;

@Serdeable
public record EventSummary(String id, String name, String startsAt, String endsAt, String registrationUrl) {
}
