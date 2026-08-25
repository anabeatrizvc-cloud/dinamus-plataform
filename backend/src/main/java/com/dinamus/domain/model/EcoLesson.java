package com.dinamus.domain.model;

import io.micronaut.serde.annotation.Serdeable;

@Serdeable
public record EcoLesson(String id, String title, String lessonDate) {
}
