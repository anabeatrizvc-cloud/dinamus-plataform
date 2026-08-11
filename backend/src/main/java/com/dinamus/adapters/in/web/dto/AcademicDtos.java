package com.dinamus.adapters.in.web.dto;

import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public final class AcademicDtos {
    private AcademicDtos() {
    }

    @Serdeable
    public record CourseRequest(@NotBlank @Size(min = 3) String title, String description, @NotBlank String startsAt, String endsAt, String status) {
    }

    @Serdeable
    public record DisciplineRequest(@NotBlank String courseId, @NotBlank @Size(min = 3) String title, String description, List<String> teacherIds, int maxAbsences, boolean usesGrades) {
    }

    @Serdeable
    public record EnrollmentRequest(@NotBlank String disciplineId, @NotBlank String studentId) {
    }

    @Serdeable
    public record LessonRequest(@NotBlank String disciplineId, @NotBlank @Size(min = 3) String title, @NotBlank String lessonDate) {
    }

    @Serdeable
    public record MaterialRequest(@NotBlank String disciplineId, String lessonId, @NotBlank @Size(min = 3) String title, @NotBlank String url) {
    }

    @Serdeable
    public record EvaluationRequest(@NotBlank String disciplineId, @NotBlank @Size(min = 3) String title, double weight, double maxScore) {
    }

    @Serdeable
    public record GradeRequest(@NotBlank String evaluationId, @NotBlank String studentId, double score) {
    }

    @Serdeable
    public record AttendanceScanRequest(@NotBlank String token) {
    }

    @Serdeable
    public record AttendanceValidationRequest(boolean present) {
    }
}
