package com.dinamus.domain.model;

import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

@Serdeable
public record MemberAccount(
    String id,
    String name,
    String phone,
    String email,
    String passwordHash,
    List<String> roles,
    boolean active,
    String passwordSetupToken
) {
    public MemberAccount {
        id = id == null ? "" : id;
        name = name == null ? "" : name;
        phone = phone == null ? "" : phone;
        email = email == null ? "" : email;
        passwordHash = passwordHash == null ? "" : passwordHash;
        roles = roles == null ? List.of("MEMBRO") : roles;
        passwordSetupToken = passwordSetupToken == null ? "" : passwordSetupToken;
    }

    public UserAccount toUserAccount() {
        return new UserAccount(id, name, email, passwordHash, roles, active);
    }
}
