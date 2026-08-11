package com.dinamus.domain.model;

import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

@Serdeable
public record DisciplineSummary(
    String id,
    String courseId,
    String title,
    String description,
    List<String> teacherIds,
    int maxAbsences,
    boolean usesGrades
) {
}
