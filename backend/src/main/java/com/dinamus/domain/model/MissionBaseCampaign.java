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
    String updatedAt,
    long version,
    List<MissionBaseStage> legacyStages
) {
    public MissionBaseCampaign(String id, String title, String description, boolean active,
                               List<MissionBaseStage> stages, String createdAt, String updatedAt) {
        this(id, title, description, active, stages, createdAt, updatedAt, 0, List.of());
    }
}
