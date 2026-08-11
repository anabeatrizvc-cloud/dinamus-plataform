package com.dinamus.application.usecases;

import com.dinamus.application.ports.IdentityRepository;
import com.dinamus.application.ports.InvitationPort;
import com.dinamus.domain.model.MemberAccount;
import com.dinamus.domain.model.MemberSummary;
import jakarta.inject.Singleton;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Singleton
public class ManageMembersUseCase {
    private final IdentityRepository repository;
    private final InvitationPort invitations;

    public ManageMembersUseCase(IdentityRepository repository, InvitationPort invitations) {
        this.repository = repository;
        this.invitations = invitations;
    }

    public List<MemberSummary> list() {
        return repository.listMembers().stream().map(this::summary).toList();
    }

    public MemberSummary create(String name, String phone, String email, List<String> roles) {
        String normalizedEmail = normalizeEmail(email);
        if (!normalizedEmail.isBlank() && repository.findMemberByEmail(normalizedEmail).isPresent()) {
            throw new IllegalArgumentException("Member email already exists");
        }
        MemberAccount member = new MemberAccount(
            UUID.randomUUID().toString(),
            name.trim(),
            normalize(phone),
            normalizedEmail,
            "",
            normalizeRoles(roles),
            normalizedEmail.isBlank(),
            normalizedEmail.isBlank() ? "" : UUID.randomUUID().toString()
        );
        MemberAccount saved = repository.saveMember(member);
        invitations.sendPasswordSetup(saved);
        return summary(saved);
    }

    public MemberSummary update(String id, String name, String phone, String email, List<String> roles, boolean active) {
        MemberAccount current = repository.findMemberById(id).orElseThrow(() -> new IllegalArgumentException("Member not found"));
        String normalizedEmail = normalizeEmail(email);
        if (!normalizedEmail.isBlank()) {
            repository.findMemberByEmail(normalizedEmail)
                .filter(found -> !found.id().equals(id))
                .ifPresent(found -> {
                    throw new IllegalArgumentException("Member email already exists");
                });
        }

        String setupToken = setupToken(current, normalizedEmail);

        MemberAccount updated = new MemberAccount(
            current.id(),
            name.trim(),
            normalize(phone),
            normalizedEmail,
            current.passwordHash(),
            normalizeRoles(roles),
            active,
            setupToken
        );
        MemberAccount saved = repository.saveMember(updated);
        if (!setupToken.isBlank() && !setupToken.equals(current.passwordSetupToken())) {
            invitations.sendPasswordSetup(saved);
        }
        return summary(saved);
    }

    public MemberSummary resendInvite(String id) {
        MemberAccount current = repository.findMemberById(id).orElseThrow(() -> new IllegalArgumentException("Member not found"));
        if (current.email().isBlank()) {
            throw new IllegalArgumentException("Member has no email");
        }
        if (!current.passwordHash().isBlank()) {
            return summary(current);
        }
        String token = current.passwordSetupToken().isBlank() ? UUID.randomUUID().toString() : current.passwordSetupToken();
        MemberAccount updated = new MemberAccount(current.id(), current.name(), current.phone(), current.email(), current.passwordHash(), current.roles(), current.active(), token);
        MemberAccount saved = repository.saveMember(updated);
        invitations.sendPasswordSetup(saved);
        return summary(saved);
    }

    public void delete(String id) {
        repository.deleteMember(id);
    }

    private MemberSummary summary(MemberAccount member) {
        boolean invitePending = !member.email().isBlank() && member.passwordHash().isBlank() && !member.passwordSetupToken().isBlank();
        return new MemberSummary(member.id(), member.name(), member.phone(), member.email(), member.roles(), member.active(), invitePending, invitePending ? member.passwordSetupToken() : "");
    }

    private List<String> normalizeRoles(List<String> roles) {
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        normalized.add("MEMBRO");
        for (String role : roles == null ? List.<String>of() : roles) {
            String value = normalize(role).toUpperCase(Locale.ROOT);
            if (List.of("ADMIN", "PROFESSOR", "MEMBRO").contains(value)) {
                normalized.add(value);
            }
        }
        return new ArrayList<>(normalized);
    }

    private String normalizeEmail(String value) {
        return normalize(value).toLowerCase(Locale.ROOT);
    }

    private String setupToken(MemberAccount current, String email) {
        if (email.isBlank() || !current.passwordHash().isBlank()) {
            return "";
        }
        return current.passwordSetupToken().isBlank() ? UUID.randomUUID().toString() : current.passwordSetupToken();
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}
