package com.dinamus.domain.model;

import io.micronaut.serde.annotation.Serdeable;

@Serdeable
public record GrowthGroup(String id, String name, String neighborhood, String dayOfWeek, String leader) {
}
