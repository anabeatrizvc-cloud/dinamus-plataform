package com.dinamus.domain.model;

import io.micronaut.serde.annotation.Serdeable;

@Serdeable
public record CourseSummary(String id, String title, String description, String startsAt, String endsAt, String status) {
    public CourseSummary {
        id = id == null ? "" : id;
        title = title == null ? "" : title;
        description = description == null ? "" : description;
        startsAt = startsAt == null ? "" : startsAt;
        endsAt = endsAt == null ? "" : endsAt;
        status = status == null || status.isBlank() ? "OPEN" : status;
    }
}
