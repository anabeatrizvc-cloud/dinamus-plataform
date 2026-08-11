package com.dinamus.domain.model;

import io.micronaut.serde.annotation.Serdeable;

@Serdeable
public record EnrollmentSummary(String id, String disciplineId, String studentId, String status) {
}
