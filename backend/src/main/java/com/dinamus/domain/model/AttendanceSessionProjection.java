package com.dinamus.domain.model;

import io.micronaut.serde.annotation.Serdeable;

@Serdeable
public record AttendanceSessionProjection(
    String publicCode,
    String courseTitle,
    String disciplineTitle,
    String lessonTitle,
    String lessonDate,
    String status,
    String expiresAt,
    int registeredCount,
    int expectedCount
) {
}
