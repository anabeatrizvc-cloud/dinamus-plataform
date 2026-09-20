package com.dinamus;

import com.dinamus.adapters.out.persistence.CouchDbContentRepository;
import com.dinamus.adapters.out.persistence.CouchDbProperties;
import com.dinamus.application.ports.PasswordHasher;
import com.dinamus.domain.model.MissionBaseCampaign;
import com.dinamus.domain.model.MissionBaseConflictException;
import com.sun.net.httpserver.HttpServer;
import io.micronaut.serde.ObjectMapper;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.jupiter.api.Assertions.*;

@MicronautTest(startApplication = false)
class MissionBaseCouchContractTest {
    @Inject ObjectMapper mapper;
    private HttpServer server;
    private CouchDbContentRepository repository;
    private final AtomicInteger getStatus = new AtomicInteger(404);
    private final AtomicInteger putStatus = new AtomicInteger(201);
    private final AtomicReference<String> document = new AtomicReference<>("{}");
    private final AtomicReference<String> written = new AtomicReference<>();

    @BeforeEach void start() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/test/mission-base-campaign:current", exchange -> {
            boolean get = exchange.getRequestMethod().equals("GET");
            if (!get) written.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] body = (get ? document.get() : "{}").getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(get ? getStatus.get() : putStatus.get(), body.length);
            try (var response = exchange.getResponseBody()) { response.write(body); }
        });
        server.start();
        CouchDbProperties properties = new CouchDbProperties();
        properties.setUrl("http://127.0.0.1:" + server.getAddress().getPort());
        properties.setDatabase("test");
        repository = new CouchDbContentRepository(properties, mapper, new PasswordHasher() {
            public String hash(String raw) { return "test-hash"; }
            public boolean matches(String raw, String hash) { return false; }
        });
    }
    @AfterEach void stop() { server.stop(0); }
    private MissionBaseCampaign campaign(long version) {
        return new MissionBaseCampaign("current", "Base", "Base Mission Farm", true, List.of(), null, null, version, List.of());
    }
    @Test void oldDocumentWithoutVersionOrArchiveIsReadable() throws Exception {
        getStatus.set(200);
        document.set("""
            {"_id":"mission-base-campaign:current","_rev":"1-old","type":"mission-base-campaign",
             "payload":{"id":"current","title":"Base","description":"Base Mission Farm","active":true,
             "stages":[{"id":"reforma","name":"Reforma","description":"Espaços","goalCents":100,"raisedCents":20,
             "status":"EM_BREVE","icon":"tool","sortOrder":2,"current":false,"visible":true}]}}
            """);
        var old = repository.findMissionBaseCampaign().orElseThrow();
        assertEquals(0, old.version());
        assertEquals(20, old.stages().getFirst().raisedCents());
        assertNull(old.stages().getFirst().updatedBy());
        assertNull(written.get());
    }
    @Test void writesTheRevisionThatWasReadAndRejectsStaleVersion() throws Exception {
        getStatus.set(200);
        document.set(mapper.writeValueAsString(Map.of("_id", "mission-base-campaign:current", "_rev", "7-existing", "type", "mission-base-campaign", "payload", campaign(4))));
        assertThrows(MissionBaseConflictException.class, () -> repository.saveMissionBaseCampaign(campaign(5), 3));
        assertNull(written.get());
        repository.saveMissionBaseCampaign(campaign(5), 4);
        assertTrue(written.get().contains("\"_rev\":\"7-existing\""));
        assertTrue(written.get().contains("\"version\":5"));
    }
    @Test void simultaneousCouchRevisionConflictIsNotReportedAsSuccess() {
        putStatus.set(409);
        assertThrows(MissionBaseConflictException.class, () -> repository.saveMissionBaseCampaign(campaign(1), 0));
    }
    @Test void unavailableOrCorruptStorageNeverBecomesAnEmptyCampaign() {
        getStatus.set(500);
        assertThrows(IllegalStateException.class, repository::findMissionBaseCampaign);
        assertThrows(IllegalStateException.class, () -> repository.saveMissionBaseCampaign(campaign(1), 0));
        assertNull(written.get());
        getStatus.set(200);
        document.set("not-json");
        assertThrows(IllegalStateException.class, repository::findMissionBaseCampaign);
    }
}
