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
    public UserAccount toUserAccount() {
        return new UserAccount(id, name, email, passwordHash, roles, active);
    }
}
