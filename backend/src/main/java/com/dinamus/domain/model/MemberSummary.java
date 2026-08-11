package com.dinamus.domain.model;

import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

@Serdeable
public record MemberSummary(
    String id,
    String name,
    String phone,
    String email,
    List<String> roles,
    boolean active,
    boolean invitePending,
    String setupToken
) {
}
