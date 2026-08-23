package com.dinamus.domain.model;

import io.micronaut.serde.annotation.Serdeable;

@Serdeable
public record AttendanceAudit(
    String id,
    String attendanceEntryId,
    String actorId,
    String changedAt,
    String previousStatus,
    String newStatus,
    String reason
) {
}
