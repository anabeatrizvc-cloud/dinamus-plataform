package com.dinamus.domain.model;

import io.micronaut.serde.annotation.Serdeable;

@Serdeable
public record AttendanceEntry(String id, String lessonId, String studentId, String status, String scannedAt, String validatedAt) {
    public AttendanceEntry {
        id = id == null ? "" : id;
        lessonId = lessonId == null ? "" : lessonId;
        studentId = studentId == null ? "" : studentId;
        status = status == null || status.isBlank() ? "PENDING_VALIDATION" : status;
        scannedAt = scannedAt == null ? "" : scannedAt;
        validatedAt = validatedAt == null ? "" : validatedAt;
    }
}
