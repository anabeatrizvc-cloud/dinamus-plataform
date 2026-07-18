package com.dinamus.domain.model;

import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

@Serdeable
public record UserAccount(String id, String name, String email, String passwordHash, List<String> roles, boolean active) {
}
