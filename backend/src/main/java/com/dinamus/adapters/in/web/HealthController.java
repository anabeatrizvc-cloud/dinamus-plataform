package com.dinamus.adapters.in.web;

import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;
import io.micronaut.serde.annotation.Serdeable;

@Controller("/api/v1/health")
@Secured(SecurityRule.IS_ANONYMOUS)
public class HealthController {
    @Get
    public HealthResponse health() {
        return new HealthResponse("ok");
    }

    @Serdeable
    public record HealthResponse(String status) {
    }
}
