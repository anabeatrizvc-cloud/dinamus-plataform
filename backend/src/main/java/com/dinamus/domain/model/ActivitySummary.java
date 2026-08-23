package com.dinamus.domain.model;

import io.micronaut.serde.annotation.Serdeable;

@Serdeable
public record ActivitySummary(
    String id,
    String disciplineId,
    String lessonId,
    String title,
    String description,
    String dueAt,
    double points,
    String status
) {
    public ActivitySummary {
        id = id == null ? "" : id;
        disciplineId = disciplineId == null ? "" : disciplineId;
        lessonId = lessonId == null ? "" : lessonId;
        title = title == null ? "" : title;
        description = description == null ? "" : description;
        dueAt = dueAt == null ? "" : dueAt;
        points = Math.max(0, points);
        status = status == null || status.isBlank() ? "PUBLISHED" : status;
    }
}
