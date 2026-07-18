package com.dinamus.adapters.out.persistence;

import com.dinamus.application.ports.ContentRepository;
import com.dinamus.application.ports.PasswordHasher;
import com.dinamus.domain.model.AgendaItem;
import com.dinamus.domain.model.EventSummary;
import com.dinamus.domain.model.FirstVisit;
import com.dinamus.domain.model.GrowthGroup;
import com.dinamus.domain.model.PrayerRequest;
import com.dinamus.domain.model.UserAccount;
import io.micronaut.context.annotation.Requires;
import jakarta.inject.Singleton;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;

@Singleton
@Requires(property = "couchdb.enabled", notEquals = "true")
public class InMemoryContentRepository implements ContentRepository {
    private final List<PrayerRequest> prayerRequests = new CopyOnWriteArrayList<>();
    private final List<FirstVisit> firstVisits = new CopyOnWriteArrayList<>();
    private final List<UserAccount> users;

    public InMemoryContentRepository(PasswordHasher hasher) {
        this.users = List.of(new UserAccount(
            "admin-local",
            "Equipe DNMS",
            "admin@dinamus.local",
            hasher.hash("dnms-admin"),
            List.of("ADMIN"),
            true
        ));
    }

    @Override
    public List<AgendaItem> listAgenda() {
        return List.of(
            new AgendaItem("sun-celebration", "Celebracao da familia", "Domingo, 10:30", "Campus Recife"),
            new AgendaItem("mid-week-prayer", "Noite de oracao", "Quarta, 19:30", "Intercessao"),
            new AgendaItem("volunteers", "Escala de voluntarios", "Sabado, 15:00", "Voluntariado")
        );
    }

    @Override
    public List<EventSummary> listEvents() {
        return List.of(
            new EventSummary("connect-night", "Connect Night", "Sexta, 20:00", "Auditorio principal", "open"),
            new EventSummary("leader-training", "Treinamento de lideres", "Sabado, 15:00", "Sala multiuso", "scheduled")
        );
    }

    @Override
    public List<GrowthGroup> listGrowthGroups() {
        return List.of(
            new GrowthGroup("boa-viagem", "GC Boa Viagem", "Boa Viagem", "Terca", "Pr. Rafael"),
            new GrowthGroup("casa-forte", "GC Casa Forte", "Casa Forte", "Quinta", "Lid. Mariana"),
            new GrowthGroup("varzea", "GC Varzea", "Varzea", "Sexta", "Lid. Lucas")
        );
    }

    @Override
    public PrayerRequest savePrayerRequest(PrayerRequest request) {
        prayerRequests.add(request);
        return request;
    }

    @Override
    public FirstVisit saveFirstVisit(FirstVisit visit) {
        firstVisits.add(visit);
        return visit;
    }

    @Override
    public Optional<UserAccount> findUserByEmail(String email) {
        return new ArrayList<>(users).stream()
            .filter(user -> user.email().equalsIgnoreCase(email))
            .findFirst();
    }
}
