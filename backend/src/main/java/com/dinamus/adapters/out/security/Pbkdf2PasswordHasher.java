package com.dinamus.adapters.out.security;

import com.dinamus.application.ports.PasswordHasher;
import jakarta.inject.Singleton;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.SecureRandom;
import java.util.Base64;

@Singleton
public class Pbkdf2PasswordHasher implements PasswordHasher {
    private static final int ITERATIONS = 120_000;
    private static final int KEY_LENGTH = 256;
    private static final SecureRandom RANDOM = new SecureRandom();

    @Override
    public boolean matches(String raw, String hash) {
        if (hash == null || !hash.startsWith("pbkdf2$")) {
            return false;
        }
        String[] parts = hash.split("\\$");
        if (parts.length != 4) {
            return false;
        }
        byte[] salt = Base64.getDecoder().decode(parts[2]);
        String candidate = encode(raw, Integer.parseInt(parts[1]), salt);
        return MessageDigestSupport.constantTimeEquals(candidate, hash);
    }

    @Override
    public String hash(String raw) {
        byte[] salt = new byte[16];
        RANDOM.nextBytes(salt);
        return encode(raw, ITERATIONS, salt);
    }

    private String encode(String raw, int iterations, byte[] salt) {
        try {
            PBEKeySpec spec = new PBEKeySpec(raw.toCharArray(), salt, iterations, KEY_LENGTH);
            byte[] encoded = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
            return "pbkdf2$" + iterations + "$" + Base64.getEncoder().encodeToString(salt) + "$" + Base64.getEncoder().encodeToString(encoded);
        } catch (Exception exception) {
            throw new IllegalStateException("Could not hash password", exception);
        }
    }

    private static final class MessageDigestSupport {
        private static boolean constantTimeEquals(String left, String right) {
            if (left.length() != right.length()) {
                return false;
            }
            int result = 0;
            for (int index = 0; index < left.length(); index++) {
                result |= left.charAt(index) ^ right.charAt(index);
            }
            return result == 0;
        }
    }
}
