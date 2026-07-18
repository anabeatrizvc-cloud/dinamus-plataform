package com.dinamus.application.ports;

public interface PasswordHasher {
    boolean matches(String raw, String hash);

    String hash(String raw);
}
