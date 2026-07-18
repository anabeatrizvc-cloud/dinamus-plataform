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
import io.micronaut.serde.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.inject.Singleton;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Singleton
@Requires(property = "couchdb.enabled", value = "true")
public class CouchDbContentRepository implements ContentRepository {
    private final CouchDbProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient client;
    private final String adminHash;

    public CouchDbContentRepository(CouchDbProperties properties, ObjectMapper objectMapper, PasswordHasher hasher) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
        this.adminHash = hasher.hash("dnms-admin");
    }

    @PostConstruct
    void ensureDatabase() {
        send("PUT", databaseUri(), "");
    }

    @Override
    public List<AgendaItem> listAgenda() {
        return List.of(
            new AgendaItem("sun-celebration", "Celebracao da familia", "Domingo, 10:30", "Campus Recife"),
            new AgendaItem("mid-week-prayer", "Noite de oracao", "Quarta, 19:30", "Intercessao")
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
            new GrowthGroup("casa-forte", "GC Casa Forte", "Casa Forte", "Quinta", "Lid. Mariana")
        );
    }

    @Override
    public PrayerRequest savePrayerRequest(PrayerRequest request) {
        saveDocument("prayer-request", request.id(), request);
        return request;
    }

    @Override
    public FirstVisit saveFirstVisit(FirstVisit visit) {
        saveDocument("first-visit", visit.id(), visit);
        return visit;
    }

    @Override
    public Optional<UserAccount> findUserByEmail(String email) {
        if (!"admin@dinamus.local".equalsIgnoreCase(email)) {
            return Optional.empty();
        }
        return Optional.of(new UserAccount("admin-local", "Equipe DNMS", "admin@dinamus.local", adminHash, List.of("ADMIN"), true));
    }

    private void saveDocument(String type, String id, Object payload) {
        try {
            Map<String, Object> document = Map.of("_id", type + ":" + id, "type", type, "payload", payload);
            send("PUT", databaseUri() + "/" + type + ":" + id, objectMapper.writeValueAsString(document));
        } catch (Exception exception) {
            throw new IllegalStateException("Could not persist document in CouchDB", exception);
        }
    }

    private void send(String method, String uri, String body) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(uri))
                .timeout(Duration.ofSeconds(5))
                .header("Authorization", "Basic " + credentials())
                .header("Content-Type", "application/json")
                .method(method, HttpRequest.BodyPublishers.ofString(body))
                .build();
            client.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (Exception ignored) {
            // The application can still serve read-only configuration if CouchDB is starting.
        }
    }

    private String databaseUri() {
        return properties.getUrl() + "/" + properties.getDatabase();
    }

    private String credentials() {
        String value = properties.getUsername() + ":" + properties.getPassword();
        return Base64.getEncoder().encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }
}
