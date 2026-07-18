package com.dinamus.domain.model;

import io.micronaut.serde.annotation.Serdeable;

import java.time.Instant;

@Serdeable
public record PrayerRequest(String id, String name, String phone, String message, Instant createdAt, String status) {
}
