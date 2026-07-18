package com.dinamus.adapters.out.security;

import com.dinamus.application.ports.AuthTokenPort;
import com.dinamus.domain.model.UserAccount;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.security.token.generator.TokenGenerator;
import jakarta.inject.Singleton;

import java.util.Map;
import java.util.UUID;

@Singleton
public class JwtAuthTokenAdapter implements AuthTokenPort {
    private final TokenGenerator tokenGenerator;

    public JwtAuthTokenAdapter(TokenGenerator tokenGenerator) {
        this.tokenGenerator = tokenGenerator;
    }

    @Override
    public IssuedTokens issue(UserAccount user) {
        Authentication authentication = Authentication.build(user.email(), user.roles(), Map.of(
            "sub", user.id(),
            "name", user.name(),
            "email", user.email()
        ));
        String accessToken = tokenGenerator.generateToken(authentication, 3600)
            .orElseThrow(() -> new IllegalStateException("Could not generate access token"));
        return new IssuedTokens(accessToken, UUID.randomUUID().toString());
    }
}
