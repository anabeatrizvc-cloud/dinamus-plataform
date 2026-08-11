package com.dinamus.domain.model;

import io.micronaut.serde.annotation.Serdeable;

@Serdeable
public record EvaluationSummary(String id, String disciplineId, String title, double weight, double maxScore) {
}
