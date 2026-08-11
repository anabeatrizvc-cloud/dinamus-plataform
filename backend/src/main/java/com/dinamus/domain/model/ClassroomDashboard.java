package com.dinamus.domain.model;

import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

@Serdeable
public record ClassroomDashboard(List<CourseSummary> courses, List<DisciplineSummary> enrolledDisciplines, List<DisciplineSummary> teachingDisciplines) {
}
