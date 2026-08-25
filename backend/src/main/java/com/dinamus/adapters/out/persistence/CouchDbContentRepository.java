package com.dinamus.adapters.out.persistence;

import com.dinamus.application.ports.ContentRepository;
import com.dinamus.application.ports.PasswordHasher;
import com.dinamus.domain.model.AgendaItem;
import com.dinamus.domain.model.EcoAttendance;
import com.dinamus.domain.model.EcoLesson;
import com.dinamus.domain.model.EventSummary;
import com.dinamus.domain.model.FirstVisit;
import com.dinamus.domain.model.GrowthGroup;
import com.dinamus.domain.model.PrayerRequest;
import com.dinamus.domain.model.UserAccount;
import io.micronaut.context.annotation.Requires;
import io.micronaut.core.type.Argument;
import io.micronaut.serde.ObjectMapper;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.annotation.PostConstruct;
import jakarta.inject.Singleton;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.net.URLEncoder;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static com.dinamus.application.usecases.ManageEcoAttendanceUseCase.ECO_LESSON_DATE;
import static com.dinamus.application.usecases.ManageEcoAttendanceUseCase.ECO_LESSON_ID;

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
        request("PUT", databaseUri(), "");
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
        return listEventDocuments().orElse(List.of());
    }

    @Override
    public EventSummary saveEvent(EventSummary event) {
        saveDocument("event", event.id(), event);
        return event;
    }

    @Override
    public void deleteEvent(String id) {
        findRevisionDocument("event", id).ifPresent(document -> send("DELETE", documentUri("event", id) + "?rev=" + encode(document._rev()), ""));
    }

    @Override
    public List<EcoLesson> listEcoLessons() {
        return List.of(new EcoLesson(ECO_LESSON_ID, "Aula", ECO_LESSON_DATE));
    }

    @Override
    public EcoAttendance saveEcoAttendance(EcoAttendance attendance) {
        saveDocument("eco-attendance", attendance.id(), attendance);
        return attendance;
    }

    @Override
    public List<EcoAttendance> listEcoAttendances(String lessonId) {
        return listEcoAttendanceDocuments().orElse(List.of()).stream()
            .filter(attendance -> attendance.lessonId().equals(lessonId))
            .toList();
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
            Optional<CouchRevisionDocument> existing = findRevisionDocument(type, id);
            Map<String, Object> document = existing
                .map(found -> Map.of("_id", type + ":" + id, "_rev", found._rev(), "type", type, "payload", payload))
                .orElseGet(() -> Map.of("_id", type + ":" + id, "type", type, "payload", payload));
            send("PUT", databaseUri() + "/" + type + ":" + id, objectMapper.writeValueAsString(document));
        } catch (Exception exception) {
            throw new IllegalStateException("Could not persist document in CouchDB", exception);
        }
    }

    private Optional<List<EventSummary>> listEventDocuments() {
        try {
            String uri = databaseUri() + "/_all_docs?include_docs=true&startkey=" + encode("\"event:\"") + "&endkey=" + encode("\"event:\ufff0\"");
            Optional<String> response = request("GET", uri, "");
            if (response.isEmpty()) {
                return Optional.empty();
            }
            CouchRows rows = objectMapper.readValue(response.get(), Argument.of(CouchRows.class));
            return Optional.of(rows.rows().stream()
                .map(CouchRow::doc)
                .filter(document -> document != null && document.payload() != null)
                .map(CouchDocument::payload)
                .toList());
        } catch (Exception exception) {
            return Optional.empty();
        }
    }

    private Optional<List<EcoAttendance>> listEcoAttendanceDocuments() {
        try {
            String uri = databaseUri() + "/_all_docs?include_docs=true&startkey=" + encode("\"eco-attendance:\"") + "&endkey=" + encode("\"eco-attendance:\ufff0\"");
            Optional<String> response = request("GET", uri, "");
            if (response.isEmpty()) {
                return Optional.empty();
            }
            CouchEcoAttendanceRows rows = objectMapper.readValue(response.get(), Argument.of(CouchEcoAttendanceRows.class));
            return Optional.of(rows.rows().stream()
                .map(CouchEcoAttendanceRow::doc)
                .filter(document -> document != null && document.payload() != null)
                .map(CouchEcoAttendanceDocument::payload)
                .toList());
        } catch (Exception exception) {
            return Optional.empty();
        }
    }

    private Optional<CouchRevisionDocument> findRevisionDocument(String type, String id) {
        return request("GET", documentUri(type, id), "").flatMap(this::readRevisionDocument);
    }

    private Optional<CouchRevisionDocument> readRevisionDocument(String body) {
        try {
            return Optional.of(objectMapper.readValue(body, Argument.of(CouchRevisionDocument.class)));
        } catch (Exception exception) {
            return Optional.empty();
        }
    }

    private void send(String method, String uri, String body) {
        if (request(method, uri, body).isEmpty()) {
            throw new IllegalStateException("Could not complete CouchDB request");
        }
    }

    private Optional<String> request(String method, String uri, String body) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(uri))
                .timeout(Duration.ofSeconds(5))
                .header("Authorization", "Basic " + credentials())
                .header("Content-Type", "application/json")
                .method(method, HttpRequest.BodyPublishers.ofString(body))
                .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return Optional.of(response.body());
            }
        } catch (Exception ignored) {
            // The application can still serve read-only configuration if CouchDB is starting.
        }
        return Optional.empty();
    }

    private String databaseUri() {
        return properties.getUrl() + "/" + properties.getDatabase();
    }

    private String documentUri(String type, String id) {
        return databaseUri() + "/" + type + ":" + id;
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private String credentials() {
        String value = properties.getUsername() + ":" + properties.getPassword();
        return Base64.getEncoder().encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    @Serdeable
    record CouchRows(List<CouchRow> rows) {
    }

    @Serdeable
    record CouchRow(CouchDocument doc) {
    }

    @Serdeable
    record CouchDocument(String _id, String _rev, String type, EventSummary payload) {
    }

    @Serdeable
    record CouchEcoAttendanceRows(List<CouchEcoAttendanceRow> rows) {
    }

    @Serdeable
    record CouchEcoAttendanceRow(CouchEcoAttendanceDocument doc) {
    }

    @Serdeable
    record CouchEcoAttendanceDocument(String _id, String _rev, String type, EcoAttendance payload) {
    }

    @Serdeable
    record CouchRevisionDocument(String _id, String _rev, String type) {
    }
}
