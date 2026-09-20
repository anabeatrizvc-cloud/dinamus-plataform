package com.dinamus.application.usecases;

import com.dinamus.adapters.out.payment.MissionBasePixProperties;
import com.dinamus.application.ports.ContentRepository;
import com.dinamus.application.ports.AuditPort;
import com.dinamus.domain.model.MissionBaseConflictException;
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
    private static final Set<String> FRONT_IDS = Set.of("aquisicao", "revitalizacao");
    private static final long MAX_MONEY_CENTS = 100_000_000_000_000L;
    private static final long MAX_PIX_AMOUNT_CENTS = 100_000_000_00L;

    private final ContentRepository repository;
    private final MissionBasePixProperties pixProperties;
    private final AuditPort audit;

    public ManageMissionBaseUseCase(ContentRepository repository, MissionBasePixProperties pixProperties, AuditPort audit) {
        this.repository = repository;
        this.pixProperties = pixProperties;
        this.audit = audit;
    }

    public CampaignView publicCampaign() {
        MissionBaseCampaign campaign = currentCampaign();
        return view(campaign, true);
    }

    public CampaignView adminCampaign() {
        return view(currentCampaign(), false);
    }

    public CampaignView update(String title, String description, boolean active, long version, List<StageUpdate> updates, String actor) {
        MissionBaseCampaign current = currentCampaign();
        if (version != current.version()) throw new MissionBaseConflictException();
        if (updates == null || updates.size() != 2 || updates.stream().anyMatch(java.util.Objects::isNull)
            || !updates.stream().map(StageUpdate::id).collect(java.util.stream.Collectors.toSet()).equals(FRONT_IDS)) {
            throw new IllegalArgumentException("Informe somente Aquisição e Revitalização, sem duplicatas.");
        }
        String now = Instant.now().toString();
        List<MissionBaseStage> stages = current.stages().stream().map(stage -> {
            StageUpdate update = updates.stream().filter(item -> stage.id().equals(item.id())).findFirst().orElseThrow();
            validateMoney(update.goalCents(), "A meta não pode ser negativa.");
            validateMoney(update.raisedCents(), "O valor destinado não pode ser negativo.");
            if (update.sortOrder() < 0 || update.sortOrder() > 100) throw new IllegalArgumentException("Ordem inválida.");
            String name = normalizeText(update.name(), "Informe o título da frente.");
            String purpose = normalizeText(update.description(), "Informe o propósito da frente.");
            if (name.length() > 80 || purpose.length() > 360) throw new IllegalArgumentException("Texto da frente muito longo.");
            boolean changed = !name.equals(stage.name()) || !purpose.equals(stage.description())
                || update.goalCents() != stage.goalCents() || update.raisedCents() != stage.raisedCents()
                || update.visible() != stage.visible() || update.sortOrder() != stage.sortOrder();
            return new MissionBaseStage(stage.id(), name, purpose, update.goalCents(), update.raisedCents(),
                stage.status(), stage.icon(), update.sortOrder(), stage.current(), update.visible(),
                changed ? now : stage.updatedAt(), changed ? actor : stage.updatedBy());
        }).sorted(Comparator.comparingInt(MissionBaseStage::sortOrder)).toList();
        MissionBaseCampaign saved = repository.saveMissionBaseCampaign(new MissionBaseCampaign(
            CAMPAIGN_ID, normalizeText(title, "Informe o título da campanha."),
            normalizeText(description, "Informe a descrição da campanha."), active, stages,
            current.createdAt() == null ? now : current.createdAt(), now, version + 1, current.legacyStages()
        ), version);
        audit.record(actor, "mission-base.updated", saved.id());
        stages.stream().filter(stage -> now.equals(stage.updatedAt()))
            .forEach(stage -> audit.record(actor, "mission-base.front.updated", stage.id()));
        return view(saved, false);
    }

    public CampaignView reset(String confirmation, long version, String actor) {
        if (!"ZERAR".equals(confirmation)) throw new IllegalArgumentException("Digite ZERAR para confirmar a operação.");
        MissionBaseCampaign current = currentCampaign();
        if (version != current.version()) throw new MissionBaseConflictException();
        String now = Instant.now().toString();
        List<MissionBaseStage> stages = current.stages().stream().map(stage -> new MissionBaseStage(
            stage.id(), stage.name(), stage.description(), stage.goalCents(), 0, stage.status(), stage.icon(),
            stage.sortOrder(), stage.current(), stage.visible(), now, actor)).toList();
        MissionBaseCampaign saved = repository.saveMissionBaseCampaign(new MissionBaseCampaign(
            current.id(), current.title(), current.description(), current.active(), stages,
            current.createdAt() == null ? now : current.createdAt(), now, version + 1, current.legacyStages()
        ), version);
        audit.record(actor, "mission-base.allocations.reset", saved.id());
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

        MissionBaseStage stage = java.util.stream.Stream.concat(campaign.stages().stream(), campaign.legacyStages().stream())
            .filter(item -> item.id().equals(stageId) && item.visible())
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Finalidade de contribuição inválida."));

        String txid = txidFor(stage);
        String payload = pixPayload(stage, amountCents, txid);
        return new PixView(stage.id(), stage.name(), amountCents, txid, payload);
    }

    private MissionBaseCampaign currentCampaign() {
        return migrate(repository.findMissionBaseCampaign().orElseGet(this::defaultCampaign));
    }

    // Reads project the old stages; only an explicit versioned save persists the preserved legacy snapshot.
    private MissionBaseCampaign migrate(MissionBaseCampaign campaign) {
        List<MissionBaseStage> original = campaign.stages() == null ? List.of() : campaign.stages();
        List<MissionBaseStage> archive = campaign.legacyStages() == null ? List.of() : campaign.legacyStages();
        if (original.size() == 2 && original.stream().map(MissionBaseStage::id)
            .collect(java.util.stream.Collectors.toSet()).equals(FRONT_IDS)) {
            return new MissionBaseCampaign(campaign.id(), campaign.title(), campaign.description(), campaign.active(),
                original, campaign.createdAt(), campaign.updatedAt(), campaign.version(), archive);
        }
        List<MissionBaseStage> defaults = defaultCampaign().stages();
        MissionBaseStage acquisition = original.stream().filter(stage -> "aquisicao".equals(stage.id()))
            .findFirst().orElse(defaults.get(0));
        List<MissionBaseStage> works = original.stream()
            .filter(stage -> Set.of("reforma", "construcao", "revitalizacao").contains(stage.id())).toList();
        MissionBaseStage revitalization = new MissionBaseStage("revitalizacao", "Revitalização", defaults.get(1).description(),
            works.stream().map(MissionBaseStage::goalCents).reduce(0L, Math::addExact),
            works.stream().map(MissionBaseStage::raisedCents).reduce(0L, Math::addExact),
            "EM_BREVE", "tool", 2, false, works.isEmpty() || works.stream().anyMatch(MissionBaseStage::visible),
            works.isEmpty() ? null : campaign.updatedAt(), null);
        MissionBaseStage adapted = new MissionBaseStage(acquisition.id(), acquisition.name(), acquisition.description(),
            acquisition.goalCents(), acquisition.raisedCents(), acquisition.status(), acquisition.icon(), 1, true,
            acquisition.visible(), acquisition.updatedAt() == null && original.contains(acquisition) ? campaign.updatedAt() : acquisition.updatedAt(),
            acquisition.updatedBy());
        return new MissionBaseCampaign(campaign.id(), campaign.title(), campaign.description(), campaign.active(),
            List.of(adapted, revitalization), campaign.createdAt(), campaign.updatedAt(), campaign.version(),
            archive.isEmpty() ? List.copyOf(original) : archive);
    }

    private MissionBaseCampaign defaultCampaign() {
        return new MissionBaseCampaign(CAMPAIGN_ID, "Um lugar para o avanço do Reino.",
            "Estamos construindo uma base missionária para servir, alcançar e transformar vidas através do Evangelho.", true,
            List.of(
                new MissionBaseStage("aquisicao", "Aquisição", "Garantir o lugar para as próximas gerações.", 0, 0, "EM_ANDAMENTO", "key", 1, true, true),
                new MissionBaseStage("revitalizacao", "Revitalização", "Transformar estruturas em vidas.", 0, 0, "EM_BREVE", "tool", 2, false, true)
            ), null, null);
    }

    private CampaignView view(MissionBaseCampaign campaign, boolean onlyVisible) {
        List<MissionBaseStage> stages = campaign.stages().stream()
            .filter(stage -> !onlyVisible || stage.visible())
            .sorted(Comparator.comparingInt(MissionBaseStage::sortOrder))
            .toList();
        long totalGoal = stages.stream().map(MissionBaseStage::goalCents).reduce(0L, Math::addExact);
        long totalRaised = stages.stream().map(MissionBaseStage::raisedCents).reduce(0L, Math::addExact);
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
                stage.visible(),
                stage.goalCents() > 0 ? Math.max(0, stage.goalCents() - stage.raisedCents()) : null,
                stage.updatedAt(), onlyVisible ? null : stage.updatedBy()
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
            campaign.updatedAt(), campaign.version()
        );
    }

    private double percent(long raisedCents, long goalCents) {
        if (goalCents <= 0) {
            return 0;
        }
        return BigDecimal.valueOf(raisedCents).multiply(BigDecimal.valueOf(100))
            .divide(BigDecimal.valueOf(goalCents), 2, RoundingMode.HALF_UP).doubleValue();
    }

    private void validateMoney(long value, String message) {
        if (value < 0) throw new IllegalArgumentException(message);
        if (value > MAX_MONEY_CENTS) throw new IllegalArgumentException("Valor financeiro acima do limite permitido.");
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

    public record StageUpdate(String id, String name, String description, long goalCents, long raisedCents, boolean visible, int sortOrder) {
    }

    public record CampaignView(
        String id,
        String title,
        String description,
        boolean active,
        long totalGoalCents,
        long totalRaisedCents,
        double percent,
        boolean goalExceeded,
        List<StageView> stages,
        String updatedAt,
        long version
    ) {
    }

    public record StageView(
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

    public record PixView(String stageId, String stageName, long amountCents, String txid, String pixPayload) {
    }
}
