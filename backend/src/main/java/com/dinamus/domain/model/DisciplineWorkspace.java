package com.dinamus.domain.model;

import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

@Serdeable
public record DisciplineWorkspace(
    CourseSummary course,
    DisciplineSummary discipline,
    List<MemberSummary> students,
    List<LessonSummary> lessons,
    List<MaterialSummary> materials,
    List<RecordedLesson> recordings,
    List<ActivitySummary> activities,
    List<EvaluationSummary> evaluations,
    List<GradeEntry> grades,
    List<AttendanceEntry> attendance,
    List<AttendanceAudit> attendanceAudits
) {
}
