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
    public LessonSummary {
        id = id == null ? "" : id;
        disciplineId = disciplineId == null ? "" : disciplineId;
        title = title == null ? "" : title;
        lessonDate = lessonDate == null ? "" : lessonDate;
        attendanceToken = attendanceToken == null ? "" : attendanceToken;
        attendanceTokenExpiresAt = attendanceTokenExpiresAt == null ? "" : attendanceTokenExpiresAt;
    }
}
