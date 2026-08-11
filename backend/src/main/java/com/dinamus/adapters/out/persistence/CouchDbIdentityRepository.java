package com.dinamus.adapters.out.persistence;

import com.dinamus.application.ports.IdentityRepository;
import com.dinamus.application.ports.PasswordHasher;
import com.dinamus.domain.model.MemberAccount;
import com.dinamus.domain.model.UserAccount;
import io.micronaut.context.annotation.Requires;
import io.micronaut.serde.ObjectMapper;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.annotation.PostConstruct;
import jakarta.inject.Singleton;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Singleton
@Requires(property = "couchdb.enabled", value = "true")
public class CouchDbIdentityRepository implements IdentityRepository {
    private static final String DOCUMENT_ID = "identity:members";

    private final CouchDbProperties properties;
    private final ObjectMapper objectMapper;
    private final PasswordHasher hasher;
    private final HttpClient client;

    public CouchDbIdentityRepository(CouchDbProperties properties, ObjectMapper objectMapper, PasswordHasher hasher) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.hasher = hasher;
        this.client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
    }

    @PostConstruct
    void ensureState() {
        request("PUT", databaseUri(), "");
        if (readState().isEmpty()) {
            saveState(new IdentityState(seedMembers(), ""));
        }
    }

    @Override
    public Optional<UserAccount> findUserByEmail(String email) {
        return findMemberByEmail(email)
            .filter(member -> !member.email().isBlank())
            .filter(member -> !member.passwordHash().isBlank())
            .map(MemberAccount::toUserAccount);
    }

    @Override
    public Optional<MemberAccount> findMemberByEmail(String email) {
        return listMembers().stream().filter(member -> member.email().equalsIgnoreCase(email)).findFirst();
    }

    @Override
    public Optional<MemberAccount> findMemberById(String id) {
        return listMembers().stream().filter(member -> member.id().equals(id)).findFirst();
    }

    @Override
    public Optional<MemberAccount> findMemberBySetupToken(String token) {
        return listMembers().stream().filter(member -> !member.passwordSetupToken().isBlank() && member.passwordSetupToken().equals(token)).findFirst();
    }

    @Override
    public List<MemberAccount> listMembers() {
        return readState().map(IdentityState::members).orElseGet(List::of);
    }

    @Override
    public MemberAccount saveMember(MemberAccount member) {
        IdentityState state = readState().orElse(new IdentityState(seedMembers(), ""));
        List<MemberAccount> members = new ArrayList<>(state.members());
        members.removeIf(item -> item.id().equals(member.id()));
        members.add(member);
        saveState(new IdentityState(members, state.rev()));
        return member;
    }

    @Override
    public void deleteMember(String id) {
        IdentityState state = readState().orElse(new IdentityState(seedMembers(), ""));
        List<MemberAccount> members = new ArrayList<>(state.members());
        members.removeIf(item -> item.id().equals(id));
        saveState(new IdentityState(members, state.rev()));
    }

    private Optional<IdentityState> readState() {
        try {
            Optional<String> response = request("GET", documentUri(), "");
            if (response.isEmpty()) {
                return Optional.empty();
            }
            StateDocument document = objectMapper.readValue(response.get(), StateDocument.class);
            return Optional.of(new IdentityState(document.members() == null ? List.of() : document.members(), document._rev()));
        } catch (Exception exception) {
            return Optional.empty();
        }
    }

    private void saveState(IdentityState state) {
        try {
            Map<String, Object> document = state.rev().isBlank()
                ? Map.of("_id", DOCUMENT_ID, "members", state.members())
                : Map.of("_id", DOCUMENT_ID, "_rev", state.rev(), "members", state.members());
            if (request("PUT", documentUri(), objectMapper.writeValueAsString(document)).isEmpty()) {
                throw new IllegalStateException("Could not persist identity state");
            }
        } catch (Exception exception) {
            throw new IllegalStateException("Could not persist identity state", exception);
        }
    }

    private List<MemberAccount> seedMembers() {
        return List.of(
            new MemberAccount("admin-local", "Equipe DNMS", "81999990000", "admin@dinamus.local", hasher.hash("dnms-admin"), List.of("ADMIN", "MEMBRO"), true, "")
        );
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
        }
        return Optional.empty();
    }

    private String documentUri() {
        return databaseUri() + "/" + URLEncoder.encode(DOCUMENT_ID, StandardCharsets.UTF_8);
    }

    private String databaseUri() {
        return properties.getUrl() + "/" + properties.getDatabase();
    }

    private String credentials() {
        String value = properties.getUsername() + ":" + properties.getPassword();
        return Base64.getEncoder().encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    record IdentityState(List<MemberAccount> members, String rev) {
    }

    @Serdeable
    record StateDocument(String _id, String _rev, List<MemberAccount> members) {
    }
}
