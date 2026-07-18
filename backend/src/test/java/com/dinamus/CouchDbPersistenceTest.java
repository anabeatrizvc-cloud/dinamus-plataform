package com.dinamus;

import com.dinamus.application.ports.ContentRepository;
import com.dinamus.domain.model.PrayerRequest;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import io.micronaut.test.support.TestPropertyProvider;
import jakarta.inject.Inject;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.utility.DockerImageName;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

@MicronautTest
@EnabledIfSystemProperty(named = "dnms.testcontainers", matches = "true")
class CouchDbPersistenceTest implements TestPropertyProvider {
    private static final GenericContainer<?> COUCHDB = new GenericContainer<>(DockerImageName.parse("couchdb:3.4"))
        .withExposedPorts(5984)
        .withEnv("COUCHDB_USER", "admin")
        .withEnv("COUCHDB_PASSWORD", "password");

    static {
        COUCHDB.start();
    }

    @Inject
    ContentRepository repository;

    @Override
    public Map<String, String> getProperties() {
        return Map.of(
            "couchdb.enabled", "true",
            "couchdb.url", "http://" + COUCHDB.getHost() + ":" + COUCHDB.getMappedPort(5984),
            "couchdb.database", "dnms_platform_test_" + UUID.randomUUID(),
            "couchdb.username", "admin",
            "couchdb.password", "password"
        );
    }

    @Test
    void persistsPrayerRequestThroughCouchDbAdapter() {
        PrayerRequest request = new PrayerRequest("test-prayer", "Ana", "81999999999", "Pedido de teste com conteudo suficiente", Instant.now(), "received");

        PrayerRequest saved = repository.savePrayerRequest(request);

        assertEquals("test-prayer", saved.id());
        assertEquals("received", saved.status());
    }

    @AfterAll
    static void stopContainer() {
        COUCHDB.stop();
    }
}
