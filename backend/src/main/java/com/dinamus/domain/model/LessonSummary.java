package com.dinamus.domain.model;

import io.micronaut.serde.annotation.Serdeable;

@Serdeable
public record LessonSummary(
    String id,
    String disciplineId,
    String title,
    String lessonDate,
    String attendanceToken,
    String attendanceTokenExpiresAt
) {
}
