package com.dinamus.domain.model;

import io.micronaut.serde.annotation.Serdeable;

@Serdeable
public record RecordedLesson(
    String id,
    String disciplineId,
    String lessonId,
    String title,
    String provider,
    String providerVideoId,
    String embedUrl,
    boolean visibleToStudents,
    String createdBy,
    String createdAt
) {
    public RecordedLesson {
        id = id == null ? "" : id;
        disciplineId = disciplineId == null ? "" : disciplineId;
        lessonId = lessonId == null ? "" : lessonId;
        title = title == null ? "" : title;
        provider = provider == null || provider.isBlank() ? "YOUTUBE" : provider;
        providerVideoId = providerVideoId == null ? "" : providerVideoId;
        embedUrl = embedUrl == null ? "" : embedUrl;
        createdBy = createdBy == null ? "" : createdBy;
        createdAt = createdAt == null ? "" : createdAt;
    }
}
