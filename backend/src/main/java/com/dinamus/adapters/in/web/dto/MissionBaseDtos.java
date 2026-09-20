package com.dinamus.adapters.in.web.dto;

import com.dinamus.application.usecases.ManageMissionBaseUseCase;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public final class MissionBaseDtos {
    private MissionBaseDtos() {
    }

    public static CampaignResponse from(ManageMissionBaseUseCase.CampaignView campaign) {
        return new CampaignResponse(
            campaign.id(),
            campaign.title(),
            campaign.description(),
            campaign.active(),
            campaign.totalGoalCents(),
            campaign.totalRaisedCents(),
            campaign.percent(),
            campaign.goalExceeded(),
            campaign.stages().stream().map(MissionBaseDtos::from).toList(),
            campaign.updatedAt(), campaign.version()
        );
    }

    public static StageResponse from(ManageMissionBaseUseCase.StageView stage) {
        return new StageResponse(
            stage.id(),
            stage.name(),
            stage.description(),
            stage.goalCents(),
            stage.raisedCents(),
            stage.percent(),
            stage.goalExceeded(),
            stage.status(),
            stage.icon(),
            stage.sortOrder(),
            stage.current(),
            stage.visible(), stage.remainingCents(), stage.updatedAt(), stage.updatedBy()
        );
    }

    @Serdeable
    public record CampaignResponse(
        String id,
        String title,
        String description,
        boolean active,
        long totalGoalCents,
        long totalRaisedCents,
        double percent,
        boolean goalExceeded,
        List<StageResponse> stages,
        String updatedAt,
        long version
    ) {
    }

    @Serdeable
    public record StageResponse(
        String id,
        String name,
        String description,
        long goalCents,
        long raisedCents,
        double percent,
        boolean goalExceeded,
        String status,
        String icon,
        int sortOrder,
        boolean current,
        boolean visible,
        Long remainingCents,
        String updatedAt,
        String updatedBy
    ) {
    }

    @Serdeable
    public record CampaignRequest(
        @NotBlank @Size(min = 3, max = 120) String title,
        @NotBlank @Size(min = 10, max = 360) String description,
        @NotNull Boolean active,
        @NotNull @Min(0) Long version,
        @NotEmpty @Size(min = 2, max = 2) List<@NotNull @Valid StageRequest> stages
    ) {
    }

    @Serdeable
    public record StageRequest(
        @NotBlank String id,
        @NotBlank @Size(min = 3, max = 80) String name,
        @NotBlank @Size(min = 3, max = 360) String description,
        @Min(0) Long goalCents,
        @NotNull @Min(0) Long raisedCents,
        @NotNull Boolean visible,
        @NotNull @Min(0) Integer sortOrder
    ) {
    }

    @Serdeable
    public record PixRequest(@NotBlank String stageId, @Min(1) long amountCents) {
    }

    @Serdeable
    public record PixResponse(String stageId, String stageName, long amountCents, String txid, String pixPayload) {
        public static PixResponse from(ManageMissionBaseUseCase.PixView pix) {
            return new PixResponse(pix.stageId(), pix.stageName(), pix.amountCents(), pix.txid(), pix.pixPayload());
        }
    }

    @Serdeable
    public record ResetRequest(@NotBlank String confirmation, @NotNull @Min(0) Long version) {
    }
}
