package com.dinamus.domain.model;

import io.micronaut.serde.annotation.Serdeable;

@Serdeable
public record EventSummary(String id, String title, String date, String location, String status) {
}
