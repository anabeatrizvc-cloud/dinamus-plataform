package com.dinamus.domain.model;

import io.micronaut.serde.annotation.Serdeable;

@Serdeable
public record EvaluationSummary(String id, String disciplineId, String title, double weight, double maxScore) {
    public EvaluationSummary {
        id = id == null ? "" : id;
        disciplineId = disciplineId == null ? "" : disciplineId;
        title = title == null ? "" : title;
        weight = Math.max(0, weight);
        maxScore = maxScore <= 0 ? 10 : maxScore;
    }
}
