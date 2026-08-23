package com.dinamus.domain.model;

import io.micronaut.serde.annotation.Serdeable;

@Serdeable
public record EnrollmentSummary(String id, String disciplineId, String studentId, String status) {
    public EnrollmentSummary {
        id = id == null ? "" : id;
        disciplineId = disciplineId == null ? "" : disciplineId;
        studentId = studentId == null ? "" : studentId;
        status = status == null || status.isBlank() ? "ACTIVE" : status;
    }
}
