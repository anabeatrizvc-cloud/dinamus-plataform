package com.dinamus.domain.model;

import io.micronaut.serde.annotation.Serdeable;

@Serdeable
public record GradeEntry(String id, String evaluationId, String studentId, double score) {
    public GradeEntry {
        id = id == null ? "" : id;
        evaluationId = evaluationId == null ? "" : evaluationId;
        studentId = studentId == null ? "" : studentId;
        score = Math.max(0, score);
    }
}
