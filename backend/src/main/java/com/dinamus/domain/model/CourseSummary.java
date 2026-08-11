package com.dinamus.domain.model;

import io.micronaut.serde.annotation.Serdeable;

@Serdeable
public record CourseSummary(String id, String title, String description, String startsAt, String endsAt, String status) {
}
