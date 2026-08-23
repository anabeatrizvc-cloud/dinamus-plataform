package com.dinamus.domain.model;

import io.micronaut.serde.annotation.Serdeable;

@Serdeable
public record MaterialSummary(String id, String disciplineId, String lessonId, String title, String url) {
    public MaterialSummary {
        id = id == null ? "" : id;
        disciplineId = disciplineId == null ? "" : disciplineId;
        lessonId = lessonId == null ? "" : lessonId;
        title = title == null ? "" : title;
        url = url == null ? "" : url;
    }
}
