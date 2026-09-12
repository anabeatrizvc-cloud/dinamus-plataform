package com.dinamus.domain.model;

import io.micronaut.serde.annotation.Serdeable;

@Serdeable
public record MissionBaseStage(
    String id,
    String name,
    String description,
    long goalCents,
    long raisedCents,
    String status,
    String icon,
    int sortOrder,
    boolean current,
    boolean visible
) {
}
