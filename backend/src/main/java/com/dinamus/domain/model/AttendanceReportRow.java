package com.dinamus.domain.model;

import io.micronaut.serde.annotation.Serdeable;

@Serdeable
public record AttendanceReportRow(
    String studentId,
    String studentName,
    int presences,
    int absences,
    double frequencyPercent,
    String situation
) {
}
