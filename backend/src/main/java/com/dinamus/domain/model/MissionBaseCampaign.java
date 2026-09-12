package com.dinamus.domain.model;

import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

@Serdeable
public record MissionBaseCampaign(
    String id,
    String title,
    String description,
    boolean active,
    List<MissionBaseStage> stages,
    String createdAt,
    String updatedAt
) {
}
