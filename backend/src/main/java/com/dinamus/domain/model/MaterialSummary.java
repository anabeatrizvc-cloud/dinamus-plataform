package com.dinamus.domain.model;

import io.micronaut.serde.annotation.Serdeable;

@Serdeable
public record MaterialSummary(String id, String disciplineId, String lessonId, String title, String url) {
}
