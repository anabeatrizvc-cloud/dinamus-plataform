package com.dinamus;

import com.dinamus.adapters.out.payment.MissionBasePixProperties;
import com.dinamus.adapters.out.persistence.InMemoryContentRepository;
import com.dinamus.application.ports.PasswordHasher;
import com.dinamus.application.usecases.ManageMissionBaseUseCase;
import com.dinamus.application.usecases.ManageMissionBaseUseCase.StageUpdate;
import com.dinamus.domain.model.MissionBaseCampaign;
import com.dinamus.domain.model.MissionBaseConflictException;
import com.dinamus.domain.model.MissionBaseStage;
import org.junit.jupiter.api.Test;
import java.util.ArrayList;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class MissionBaseUseCaseTest {
    private final InMemoryContentRepository repository = new InMemoryContentRepository(new PasswordHasher() {
        public String hash(String raw) { return "test-hash"; }
        public boolean matches(String raw, String hash) { return false; }
    });
    private final List<String> audit = new ArrayList<>();
    private final ManageMissionBaseUseCase useCase = new ManageMissionBaseUseCase(repository, new MissionBasePixProperties(),
        (actor, action, entity) -> audit.add(actor + ":" + action + ":" + entity));

    private List<StageUpdate> updates(long goal, long allocated) {
        return List.of(new StageUpdate("aquisicao", "Aquisição", "Aquisição da propriedade", goal, allocated, true, 1),
            new StageUpdate("revitalizacao", "Revitalização", "Preparação dos ambientes", 30000, 5000, true, 2));
    }
    private ManageMissionBaseUseCase.CampaignView save(long version, List<StageUpdate> stages) {
        return useCase.update("Base Mission Farm", "Destinação para as duas frentes da Base", true, version, stages, "admin-test");
    }
    @Test void initialGoalsAreUndefinedWithoutInventedDates() {
        var campaign = useCase.publicCampaign();
        assertEquals(List.of("aquisicao", "revitalizacao"), campaign.stages().stream().map(ManageMissionBaseUseCase.StageView::id).toList());
        assertNull(campaign.updatedAt());
        assertTrue(campaign.stages().stream().allMatch(stage -> stage.goalCents() == 0 && stage.remainingCents() == null && stage.updatedAt() == null));
        assertTrue(repository.findMissionBaseCampaign().isEmpty());
    }
    @Test void computesIndependentAndUncappedProgressWithAudit() {
        var saved = save(0, updates(10000, 15000));
        assertEquals(50, saved.percent());
        assertEquals(150, saved.stages().getFirst().percent());
        assertEquals(0, saved.stages().getFirst().remainingCents());
        assertEquals(25000, saved.stages().get(1).remainingCents());
        assertEquals(16.67, saved.stages().get(1).percent());
        assertEquals("admin-test", saved.stages().getFirst().updatedBy());
        assertNull(useCase.publicCampaign().stages().getFirst().updatedBy());
        assertEquals(3, audit.size());
    }
    @Test void zeroGoalDoesNotInventPercentAndStillPreservesAllocatedMoney() {
        var saved = save(0, updates(0, 25000));
        assertEquals(0, saved.stages().getFirst().percent());
        assertNull(saved.stages().getFirst().remainingCents());
        assertEquals(25000, saved.stages().getFirst().raisedCents());
    }
    @Test void rejectsNegativeHugeInvalidAndDuplicateValues() {
        assertThrows(IllegalArgumentException.class, () -> save(0, updates(-1, 0)));
        assertThrows(IllegalArgumentException.class, () -> save(0, updates(0, -1)));
        assertThrows(IllegalArgumentException.class, () -> save(0, updates(Long.MAX_VALUE, 0)));
        var first = updates(0, 0).getFirst();
        assertThrows(IllegalArgumentException.class, () -> save(0, List.of(first, first)));
        assertThrows(IllegalArgumentException.class, () -> save(0, List.of(first)));
        assertTrue(repository.findMissionBaseCampaign().isEmpty());
        assertTrue(audit.isEmpty());
    }
    @Test void conflictingUpdateAndResetCannotLoseChanges() {
        save(0, updates(10000, 15000));
        assertThrows(MissionBaseConflictException.class, () -> save(0, updates(10000, 0)));
        assertThrows(MissionBaseConflictException.class, () -> useCase.reset("ZERAR", 0, "other-admin"));
        assertEquals(15000, useCase.adminCampaign().stages().getFirst().raisedCents());
    }
    @Test void repositoryCompareAndSetRejectsStaleWrite() {
        save(0, updates(10000, 15000));
        var current = repository.findMissionBaseCampaign().orElseThrow();
        assertThrows(MissionBaseConflictException.class, () -> repository.saveMissionBaseCampaign(current, 0));
    }
    @Test void migratesOnReadThenArchivesOriginalsOnExplicitSaveAndReset() {
        var legacy = List.of(
            new MissionBaseStage("aquisicao", "Aquisição", "Lugar da Base", 10000, 2000, "EM_ANDAMENTO", "key", 1, true, true),
            new MissionBaseStage("reforma", "Reforma", "Recuperação", 20000, 5000, "EM_BREVE", "tool", 2, false, true),
            new MissionBaseStage("construcao", "Construção", "Construções", 30000, 7000, "EM_BREVE", "building", 3, false, true));
        var original = new MissionBaseCampaign("current", "Base Mission Farm", "Histórico da Base Missionária", true, legacy, "2026-01-01T00:00:00Z", "2026-08-01T00:00:00Z");
        repository.saveMissionBaseCampaign(original, 0);
        var projected = useCase.adminCampaign();
        assertEquals(50000, projected.stages().get(1).goalCents());
        assertEquals(12000, projected.stages().get(1).raisedCents());
        assertEquals(original, repository.findMissionBaseCampaign().orElseThrow());
        var changes = projected.stages().stream().map(s -> new StageUpdate(s.id(), s.name(), s.description(), s.goalCents(), s.raisedCents(), s.visible(), s.sortOrder())).toList();
        save(0, changes);
        assertEquals(legacy, repository.findMissionBaseCampaign().orElseThrow().legacyStages());
        assertTrue(useCase.generatePix("reforma", 1000).pixPayload().contains("br.gov.bcb.pix"));
        assertEquals(legacy, repository.findMissionBaseCampaign().orElseThrow().legacyStages());
        assertThrows(IllegalArgumentException.class, () -> useCase.reset("wrong", 1, "admin-test"));
        useCase.reset("ZERAR", 1, "admin-test");
        assertEquals(legacy, repository.findMissionBaseCampaign().orElseThrow().legacyStages());
        assertTrue(useCase.adminCampaign().stages().stream().allMatch(s -> s.raisedCents() == 0));
    }
    @Test void visibilityOrderAndStableAuditArePreserved() {
        var original = save(0, updates(10000, 1000));
        var savedAgain = save(1, updates(10000, 1000));
        assertEquals(original.stages().getFirst().updatedAt(), savedAgain.stages().getFirst().updatedAt());
        var hidden = new StageUpdate("aquisicao", "Aquisição", "Aquisição da propriedade", 10000, 1000, false, 3);
        save(2, List.of(hidden, updates(10000, 1000).get(1)));
        assertEquals(1, useCase.publicCampaign().stages().size());
        assertEquals("revitalizacao", useCase.publicCampaign().stages().getFirst().id());
        assertEquals(2, useCase.adminCampaign().stages().size());
    }
}
