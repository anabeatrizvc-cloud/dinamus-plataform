package com.dinamus.domain.model;

import io.micronaut.serde.annotation.Serdeable;

import java.time.Instant;
import java.time.LocalDate;

@Serdeable
public record FirstVisit(String id, String name, String phone, String email, LocalDate visitDate, Instant createdAt, String status) {
}
