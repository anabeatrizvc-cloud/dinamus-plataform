package com.dinamus.domain.model;

import io.micronaut.serde.annotation.Serdeable;

@Serdeable
public record AgendaItem(String id, String title, String startsAt, String ministry) {
}
