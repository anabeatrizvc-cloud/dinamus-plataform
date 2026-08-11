package com.dinamus.domain.model;

import io.micronaut.serde.annotation.Serdeable;

@Serdeable
public record AttendanceEntry(String id, String lessonId, String studentId, String status, String scannedAt, String validatedAt) {
}
