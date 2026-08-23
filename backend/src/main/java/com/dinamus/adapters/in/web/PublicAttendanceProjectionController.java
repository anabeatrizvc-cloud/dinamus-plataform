package com.dinamus.adapters.in.web;

import com.dinamus.application.usecases.ClassroomUseCase;
import com.dinamus.domain.model.AttendanceSessionProjection;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;

@Controller("/api/v1/attendance/public")
@Secured(SecurityRule.IS_ANONYMOUS)
public class PublicAttendanceProjectionController {
    private final ClassroomUseCase classroom;

    public PublicAttendanceProjectionController(ClassroomUseCase classroom) {
        this.classroom = classroom;
    }

    @Get("/sessions/{publicCode}")
    public AttendanceSessionProjection session(@PathVariable String publicCode) {
        return classroom.projectedSession(publicCode);
    }
}
