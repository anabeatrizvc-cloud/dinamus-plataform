package com.dinamus.domain.model;

import io.micronaut.serde.annotation.Serdeable;

@Serdeable
public record AttendanceSession(
    String id,
    String lessonId,
    String tokenHash,
    String publicCode,
    String openedBy,
    String openedAt,
    String expiresAt,
    String closedAt,
    String status,
    int version
) {
    public AttendanceSession {
        id = id == null ? "" : id;
        lessonId = lessonId == null ? "" : lessonId;
        tokenHash = tokenHash == null ? "" : tokenHash;
        publicCode = publicCode == null ? "" : publicCode;
        openedBy = openedBy == null ? "" : openedBy;
        openedAt = openedAt == null ? "" : openedAt;
        expiresAt = expiresAt == null ? "" : expiresAt;
        closedAt = closedAt == null ? "" : closedAt;
        status = status == null || status.isBlank() ? "CLOSED" : status;
    }
}
