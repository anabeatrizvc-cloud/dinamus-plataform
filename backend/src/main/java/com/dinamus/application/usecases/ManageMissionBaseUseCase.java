package com.dinamus.application.usecases;

import com.dinamus.adapters.out.payment.MissionBasePixProperties;
import com.dinamus.application.ports.ContentRepository;
import com.dinamus.domain.model.MissionBaseCampaign;
import com.dinamus.domain.model.MissionBaseStage;
import jakarta.inject.Singleton;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Singleton
public class ManageMissionBaseUseCase {
    private static final String CAMPAIGN_ID = "current";
    private static final Set<String> VALID_STATUSES = Set.of("EM_BREVE", "EM_ANDAMENTO", "CONCLUIDA");
    private static final long MAX_PIX_AMOUNT_CENTS = 100_000_000_00L;

    private final ContentRepository repository;
    private final MissionBasePixProperties pixProperties;

    public ManageMissionBaseUseCase(ContentRepository repository, MissionBasePixProperties pixProperties) {
        this.repository = repository;
        this.pixProperties = pixProperties;
    }

    public CampaignView publicCampaign() {
        MissionBaseCampaign campaign = currentCampaign();
        return view(campaign, true);
    }

    public CampaignView adminCampaign() {
        return view(currentCampaign(), false);
    }

    public CampaignView update(String title, String description, boolean active, String currentStageId, List<StageUpdate> updates) {
        MissionBaseCampaign current = currentCampaign();
        String now = Instant.now().toString();
        List<MissionBaseStage> stages = current.stages().stream()
            .map(stage -> {
                StageUpdate update = updates.stream()
                    .filter(item -> item.id().equals(stage.id()))
                    .findFirst()
                    .orElse(new StageUpdate(stage.id(), stage.goalCents(), stage.raisedCents(), stage.status(), stage.visible()));
                validateMoney(update.goalCents(), "A meta não pode ser negativa.");
                validateMoney(update.raisedCents(), "O valor arrecadado não pode ser negativo.");
                validateStatus(update.status());
                return new MissionBaseStage(
                    stage.id(),
                    stage.name(),
                    stage.description(),
                    update.goalCents(),
                    update.raisedCents(),
                    update.status(),
                    stage.icon(),
                    stage.sortOrder(),
                    stage.id().equals(currentStageId),
                    update.visible()
                );
            })
            .sorted(Comparator.comparingInt(MissionBaseStage::sortOrder))
            .toList();

        if (stages.stream().noneMatch(MissionBaseStage::current)) {
            throw new IllegalArgumentException("Defina a etapa atual da Base Missionária.");
        }

        MissionBaseCampaign saved = repository.saveMissionBaseCampaign(new MissionBaseCampaign(
            CAMPAIGN_ID,
            normalizeText(title, "Informe o título da campanha."),
            normalizeText(description, "Informe a descrição da campanha."),
            active,
            stages,
            current.createdAt(),
            now
        ));
        return view(saved, false);
    }

    public CampaignView reset(String confirmation) {
        if (!"ZERAR".equals(confirmation)) {
            throw new IllegalArgumentException("Digite ZERAR para confirmar a operação.");
        }
        MissionBaseCampaign current = currentCampaign();
        String now = Instant.now().toString();
        List<MissionBaseStage> resetStages = current.stages().stream()
            .map(stage -> new MissionBaseStage(
                stage.id(),
                stage.name(),
                stage.description(),
                stage.goalCents(),
                0,
                stage.status(),
                stage.icon(),
                stage.sortOrder(),
                stage.current(),
                stage.visible()
            ))
            .toList();
        MissionBaseCampaign saved = repository.saveMissionBaseCampaign(new MissionBaseCampaign(
            current.id(),
            current.title(),
            current.description(),
            current.active(),
            resetStages,
            current.createdAt(),
            now
        ));
        return view(saved, false);
    }

    public PixView generatePix(String stageId, long amountCents) {
        if (amountCents <= 0 || amountCents > MAX_PIX_AMOUNT_CENTS) {
            throw new IllegalArgumentException("Informe um valor de contribuição válido.");
        }

        MissionBaseCampaign campaign = currentCampaign();
        if (!campaign.active()) {
            throw new IllegalArgumentException("A Base Missionária não está recebendo contribuições no momento.");
        }

        MissionBaseStage stage = campaign.stages().stream()
            .filter(item -> item.id().equals(stageId) && item.visible())
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Finalidade de contribuição inválida."));

        String txid = txidFor(stage);
        String payload = pixPayload(stage, amountCents, txid);
        return new PixView(stage.id(), stage.name(), amountCents, txid, payload);
    }

    private MissionBaseCampaign currentCampaign() {
        MissionBaseCampaign campaign = repository.findMissionBaseCampaign().orElseGet(this::defaultCampaign);
        if (campaign.stages() == null || campaign.stages().isEmpty()) {
            campaign = defaultCampaign();
        }
        return campaign;
    }

    private MissionBaseCampaign defaultCampaign() {
        String now = Instant.now().toString();
        return new MissionBaseCampaign(
            CAMPAIGN_ID,
            "Um lugar para o avanço do Reino.",
            "Estamos construindo uma base missionária para servir, alcançar e transformar vidas através do Evangelho.",
            true,
            List.of(
                new MissionBaseStage("aquisicao", "Aquisição", "Aquisição do espaço destinado à Base Missionária.", 0, 0, "EM_ANDAMENTO", "key", 1, true, true),
                new MissionBaseStage("reforma", "Reforma", "Adequação da estrutura existente para servir pessoas com excelência.", 0, 0, "EM_BREVE", "tool", 2, false, true),
                new MissionBaseStage("construcao", "Construção", "Construção e finalização dos ambientes necessários para a missão.", 0, 0, "EM_BREVE", "building", 3, false, true)
            ),
            now,
            now
        );
    }

    private CampaignView view(MissionBaseCampaign campaign, boolean onlyVisible) {
        List<MissionBaseStage> stages = campaign.stages().stream()
            .filter(stage -> !onlyVisible || stage.visible())
            .sorted(Comparator.comparingInt(MissionBaseStage::sortOrder))
            .toList();
        long totalGoal = stages.stream().mapToLong(MissionBaseStage::goalCents).sum();
        long totalRaised = stages.stream().mapToLong(MissionBaseStage::raisedCents).sum();
        List<StageView> stageViews = stages.stream()
            .map(stage -> new StageView(
                stage.id(),
                stage.name(),
                stage.description(),
                stage.goalCents(),
                stage.raisedCents(),
                percent(stage.raisedCents(), stage.goalCents()),
                stage.goalCents() > 0 && stage.raisedCents() > stage.goalCents(),
                stage.status(),
                stage.icon(),
                stage.sortOrder(),
                stage.current(),
                stage.visible()
            ))
            .toList();
        return new CampaignView(
            campaign.id(),
            campaign.title(),
            campaign.description(),
            campaign.active(),
            totalGoal,
            totalRaised,
            percent(totalRaised, totalGoal),
            totalGoal > 0 && totalRaised > totalGoal,
            stageViews,
            campaign.updatedAt()
        );
    }

    private int percent(long raisedCents, long goalCents) {
        if (goalCents <= 0) {
            return 0;
        }
        long value = Math.round((raisedCents * 100.0) / goalCents);
        return (int) Math.max(0, Math.min(100, value));
    }

    private void validateMoney(long value, String message) {
        if (value < 0) {
            throw new IllegalArgumentException(message);
        }
    }

    private void validateStatus(String status) {
        if (!VALID_STATUSES.contains(status)) {
            throw new IllegalArgumentException("Status de etapa inválido.");
        }
    }

    private String normalizeText(String value, String message) {
        String normalized = value == null ? "" : value.trim().replaceAll("\\s+", " ");
        if (normalized.length() < 3) {
            throw new IllegalArgumentException(message);
        }
        return normalized;
    }

    private String txidFor(MissionBaseStage stage) {
        String prefix = sanitizeTxid(stage.name()).replace(" ", "");
        if (prefix.length() > 10) {
            prefix = prefix.substring(0, 10);
        }
        String date = LocalDate.now(ZoneId.of("America/Recife")).format(DateTimeFormatter.BASIC_ISO_DATE);
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase(Locale.ROOT);
        return (prefix + date + suffix).replaceAll("[^A-Z0-9]", "");
    }

    private String pixPayload(MissionBaseStage stage, long amountCents, String txid) {
        String key = cleanPixKey(pixProperties.getKey(), 77);
        if (key.isBlank()) {
            throw new IllegalArgumentException("A chave Pix da Base Missionária não está configurada.");
        }
        String gui = field("00", "br.gov.bcb.pix");
        String keyField = field("01", key);
        int descriptionRoom = 99 - gui.length() - keyField.length() - 4;
        String description = descriptionRoom > 0 ? clean(pixProperties.getDescription() + " " + stage.name(), Math.min(72, descriptionRoom)) : "";
        String merchantAccount = gui + keyField + (description.isBlank() ? "" : field("02", description));
        String additional = field("05", txid);
        String withoutCrc = field("00", "01")
            + field("01", "12")
            + field("26", merchantAccount)
            + field("52", "0000")
            + field("53", "986")
            + field("54", money(amountCents))
            + field("58", "BR")
            + field("59", clean(pixProperties.getReceiverName(), 25))
            + field("60", clean(pixProperties.getReceiverCity(), 15))
            + field("62", additional)
            + "6304";
        return withoutCrc + crc16(withoutCrc);
    }

    private String field(String id, String value) {
        if (value.length() > 99) {
            throw new IllegalArgumentException("Não foi possível montar o Pix com os dados configurados.");
        }
        return id + "%02d".formatted(value.length()) + value;
    }

    private String money(long cents) {
        return BigDecimal.valueOf(cents, 2).setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    private String clean(String value, int maxLength) {
        String normalized = value == null ? "" : Normalizer.normalize(value, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .replaceAll("[^A-Za-z0-9 .@+\\-_/]", "")
            .trim()
            .toUpperCase(Locale.ROOT);
        return normalized.length() > maxLength ? normalized.substring(0, maxLength) : normalized;
    }

    private String cleanPixKey(String value, int maxLength) {
        String normalized = value == null ? "" : Normalizer.normalize(value, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .replaceAll("[^A-Za-z0-9 .@+\\-_/]", "")
            .trim();
        return normalized.length() > maxLength ? normalized.substring(0, maxLength) : normalized;
    }

    private String sanitizeTxid(String value) {
        return clean(value, 25).replaceAll("[^A-Z0-9]", "");
    }

    private String crc16(String payload) {
        int crc = 0xFFFF;
        for (byte b : payload.getBytes(java.nio.charset.StandardCharsets.UTF_8)) {
            crc ^= (b & 0xFF) << 8;
            for (int i = 0; i < 8; i++) {
                if ((crc & 0x8000) != 0) {
                    crc = (crc << 1) ^ 0x1021;
                } else {
                    crc <<= 1;
                }
                crc &= 0xFFFF;
            }
        }
        return "%04X".formatted(crc);
    }

    public record StageUpdate(String id, long goalCents, long raisedCents, String status, boolean visible) {
    }

    public record CampaignView(
        String id,
        String title,
        String description,
        boolean active,
        long totalGoalCents,
        long totalRaisedCents,
        int percent,
        boolean goalExceeded,
        List<StageView> stages,
        String updatedAt
    ) {
    }

    public record StageView(
        String id,
        String name,
        String description,
        long goalCents,
        long raisedCents,
        int percent,
        boolean goalExceeded,
        String status,
        String icon,
        int sortOrder,
        boolean current,
        boolean visible
    ) {
    }

    public record PixView(String stageId, String stageName, long amountCents, String txid, String pixPayload) {
    }
}
