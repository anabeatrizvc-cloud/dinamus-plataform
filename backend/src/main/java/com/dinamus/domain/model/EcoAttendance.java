package com.dinamus.domain.model;

import io.micronaut.serde.annotation.Serdeable;

@Serdeable
public record EcoAttendance(
    String id,
    String lessonId,
    String lessonDate,
    String name,
    String phone,
    String photoDataUrl,
    String status,
    String createdAt,
    String validatedAt
) {
}
