package com.dinamus.adapters.in.web;

import com.dinamus.adapters.in.web.dto.AcademicDtos;
import com.dinamus.application.usecases.ManageAcademicUseCase;
import com.dinamus.domain.model.CourseSummary;
import com.dinamus.domain.model.DisciplineSummary;
import com.dinamus.domain.model.EnrollmentSummary;
import com.dinamus.domain.model.AttendanceReportRow;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.Post;
import io.micronaut.http.annotation.QueryValue;
import io.micronaut.security.annotation.Secured;
import io.micronaut.validation.Validated;
import jakarta.validation.Valid;

import java.util.List;

@Validated
@Controller("/api/v1/admin/academic")
@Secured("ADMIN")
public class AdminAcademicController {
    private final ManageAcademicUseCase academic;

    public AdminAcademicController(ManageAcademicUseCase academic) {
        this.academic = academic;
    }

    @Get("/courses")
    public List<CourseSummary> courses() {
        return academic.listCourses();
    }

    @Get("/disciplines")
    public List<DisciplineSummary> disciplines() {
        return academic.listDisciplines();
    }

    @Post("/courses")
    public CourseSummary createCourse(@Valid @Body AcademicDtos.CourseRequest request) {
        return academic.createCourse(request.title(), request.description(), request.startsAt(), request.endsAt(), request.status());
    }

    @Post("/disciplines")
    public DisciplineSummary createDiscipline(@Valid @Body AcademicDtos.DisciplineRequest request) {
        return academic.createDiscipline(request.courseId(), request.title(), request.description(), request.teacherIds(), request.maxAbsences(), request.usesGrades());
    }

    @Post("/enrollments")
    public EnrollmentSummary enroll(@Valid @Body AcademicDtos.EnrollmentRequest request) {
        return academic.enroll(request.disciplineId(), request.studentId());
    }

    @Get("/reports/attendance")
    public List<AttendanceReportRow> attendanceReport(@QueryValue String disciplineId) {
        return academic.attendanceReport(disciplineId);
    }
}
