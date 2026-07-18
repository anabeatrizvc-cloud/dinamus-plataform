package com.dinamus.adapters.in.web;

import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.security.annotation.Secured;
import io.micronaut.serde.annotation.Serdeable;

import java.security.Principal;
import java.util.List;

@Controller("/api/v1/admin")
@Secured("ADMIN")
public class AdminController {
    @Get("/dashboard")
    public AdminDashboard dashboard(Principal principal) {
        return new AdminDashboard(principal.getName(), List.of(
            new Metric("members", 128),
            new Metric("events", 2),
            new Metric("growthGroups", 14),
            new Metric("volunteers", 42)
        ));
    }

    @Serdeable
    public record AdminDashboard(String actor, List<Metric> metrics) {
    }

    @Serdeable
    public record Metric(String key, int value) {
    }
}
