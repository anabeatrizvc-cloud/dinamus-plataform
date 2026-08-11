package com.dinamus.adapters.in.web;

import com.dinamus.adapters.in.web.dto.AcademicDtos;
import com.dinamus.application.usecases.ClassroomUseCase;
import com.dinamus.application.usecases.ManageAcademicUseCase;
import com.dinamus.domain.model.AttendanceEntry;
import com.dinamus.domain.model.ClassroomDashboard;
import com.dinamus.domain.model.DisciplineWorkspace;
import com.dinamus.domain.model.EvaluationSummary;
import com.dinamus.domain.model.GradeEntry;
import com.dinamus.domain.model.LessonSummary;
import com.dinamus.domain.model.MaterialSummary;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.micronaut.security.annotation.Secured;
import io.micronaut.validation.Validated;
import jakarta.validation.Valid;

import java.security.Principal;
import java.util.List;

@Validated
@Controller("/api/v1/classroom")
@Secured({"ADMIN", "PROFESSOR", "MEMBRO"})
public class ClassroomController {
    private final ClassroomUseCase classroom;
    private final ManageAcademicUseCase academic;

    public ClassroomController(ClassroomUseCase classroom, ManageAcademicUseCase academic) {
        this.classroom = classroom;
        this.academic = academic;
    }

    @Get
    public ClassroomDashboard dashboard(Principal principal) {
        return classroom.dashboard(principal.getName());
    }

    @Get("/disciplines/{disciplineId}")
    public DisciplineWorkspace discipline(Principal principal, @PathVariable String disciplineId) {
        return classroom.discipline(principal.getName(), disciplineId);
    }

    @Post("/attendance/scan")
    public AttendanceEntry scan(Principal principal, @Valid @Body AcademicDtos.AttendanceScanRequest request) {
        return classroom.scanAttendance(principal.getName(), request.token());
    }

    @Post("/teacher/lessons")
    @Secured({"ADMIN", "PROFESSOR"})
    public LessonSummary createLesson(Principal principal, @Valid @Body AcademicDtos.LessonRequest request) {
        return academic.createLesson(principal.getName(), request.disciplineId(), request.title(), request.lessonDate());
    }

    @Post("/teacher/materials")
    @Secured({"ADMIN", "PROFESSOR"})
    public MaterialSummary addMaterial(Principal principal, @Valid @Body AcademicDtos.MaterialRequest request) {
        return academic.addMaterial(principal.getName(), request.disciplineId(), request.lessonId(), request.title(), request.url());
    }

    @Post("/teacher/evaluations")
    @Secured({"ADMIN", "PROFESSOR"})
    public EvaluationSummary addEvaluation(Principal principal, @Valid @Body AcademicDtos.EvaluationRequest request) {
        return academic.addEvaluation(principal.getName(), request.disciplineId(), request.title(), request.weight(), request.maxScore());
    }

    @Post("/teacher/grades")
    @Secured({"ADMIN", "PROFESSOR"})
    public GradeEntry saveGrade(Principal principal, @Valid @Body AcademicDtos.GradeRequest request) {
        return academic.saveGrade(principal.getName(), request.evaluationId(), request.studentId(), request.score());
    }

    @Post("/teacher/lessons/{lessonId}/attendance-token")
    @Secured({"ADMIN", "PROFESSOR"})
    public LessonSummary generateAttendanceToken(Principal principal, @PathVariable String lessonId) {
        return academic.generateAttendanceToken(principal.getName(), lessonId);
    }

    @Post("/teacher/attendance/{attendanceId}/validate")
    @Secured({"ADMIN", "PROFESSOR"})
    public AttendanceEntry validateAttendance(Principal principal, @PathVariable String attendanceId, @Body AcademicDtos.AttendanceValidationRequest request) {
        return academic.validateAttendance(principal.getName(), attendanceId, request.present());
    }

    @Post("/teacher/lessons/{lessonId}/attendance/validate-all")
    @Secured({"ADMIN", "PROFESSOR"})
    public List<AttendanceEntry> validateAll(Principal principal, @PathVariable String lessonId) {
        return academic.validateAll(principal.getName(), lessonId);
    }
}
