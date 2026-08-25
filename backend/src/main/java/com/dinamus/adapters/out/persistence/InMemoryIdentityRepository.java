package com.dinamus.adapters.out.persistence;

import com.dinamus.application.ports.IdentityRepository;
import com.dinamus.application.ports.PasswordHasher;
import com.dinamus.domain.model.MemberAccount;
import com.dinamus.domain.model.UserAccount;
import io.micronaut.context.annotation.Requires;
import jakarta.inject.Singleton;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;

@Singleton
@Requires(property = "couchdb.enabled", notEquals = "true")
public class InMemoryIdentityRepository implements IdentityRepository {
    private final List<MemberAccount> members;

    public InMemoryIdentityRepository(PasswordHasher hasher) {
        this.members = new CopyOnWriteArrayList<>(List.of(
            new MemberAccount("admin-local", "Equipe DNMS", "81999990000", "admin@dinamus.local", hasher.hash("dnms-admin"), List.of("ADMIN", "MEMBRO"), true, "")
        ));
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
        return new ArrayList<>(members);
    }

    @Override
    public MemberAccount saveMember(MemberAccount member) {
        deleteMember(member.id());
        members.add(member);
        return member;
    }

    @Override
    public void deleteMember(String id) {
        members.removeIf(member -> member.id().equals(id));
    }
}
