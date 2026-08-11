package com.dinamus.domain.model;

import io.micronaut.serde.annotation.Serdeable;

@Serdeable
public record GradeEntry(String id, String evaluationId, String studentId, double score) {
}
