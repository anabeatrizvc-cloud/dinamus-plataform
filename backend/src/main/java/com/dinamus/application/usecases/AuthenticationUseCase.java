package com.dinamus.application.usecases;

import com.dinamus.application.ports.AuthTokenPort;
import com.dinamus.application.ports.ContentRepository;
import com.dinamus.application.ports.PasswordHasher;
import com.dinamus.domain.model.UserAccount;
import jakarta.inject.Singleton;

import java.util.List;

@Singleton
public class AuthenticationUseCase {
    private final ContentRepository repository;
    private final PasswordHasher passwordHasher;
    private final AuthTokenPort tokenPort;

    public AuthenticationUseCase(ContentRepository repository, PasswordHasher passwordHasher, AuthTokenPort tokenPort) {
        this.repository = repository;
        this.passwordHasher = passwordHasher;
        this.tokenPort = tokenPort;
    }

    public AuthResult login(String email, String password) {
        UserAccount user = repository.findUserByEmail(email)
            .filter(UserAccount::active)
            .filter(candidate -> passwordHasher.matches(password, candidate.passwordHash()))
            .orElseThrow(() -> new InvalidCredentialsException("Invalid credentials"));

        AuthTokenPort.IssuedTokens tokens = tokenPort.issue(user);
        return new AuthResult(tokens.accessToken(), tokens.refreshToken(), new AuthUser(user.id(), user.name(), user.email(), user.roles()));
    }

    public record AuthResult(String accessToken, String refreshToken, AuthUser user) {
    }

    public record AuthUser(String id, String name, String email, List<String> roles) {
    }

    public static class InvalidCredentialsException extends RuntimeException {
        public InvalidCredentialsException(String message) {
            super(message);
        }
    }
}
