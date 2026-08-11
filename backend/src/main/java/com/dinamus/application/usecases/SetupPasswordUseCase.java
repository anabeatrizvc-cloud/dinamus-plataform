package com.dinamus.application.usecases;

import com.dinamus.application.ports.AuthTokenPort;
import com.dinamus.application.ports.IdentityRepository;
import com.dinamus.application.ports.PasswordHasher;
import com.dinamus.domain.model.MemberAccount;
import com.dinamus.domain.model.UserAccount;
import jakarta.inject.Singleton;

@Singleton
public class SetupPasswordUseCase {
    private final IdentityRepository repository;
    private final PasswordHasher passwordHasher;
    private final AuthTokenPort tokenPort;

    public SetupPasswordUseCase(IdentityRepository repository, PasswordHasher passwordHasher, AuthTokenPort tokenPort) {
        this.repository = repository;
        this.passwordHasher = passwordHasher;
        this.tokenPort = tokenPort;
    }

    public AuthenticationUseCase.AuthResult setup(String token, String password) {
        MemberAccount member = repository.findMemberBySetupToken(token)
            .orElseThrow(() -> new IllegalArgumentException("Invalid setup token"));
        MemberAccount activated = new MemberAccount(
            member.id(),
            member.name(),
            member.phone(),
            member.email(),
            passwordHasher.hash(password),
            member.roles(),
            true,
            ""
        );
        repository.saveMember(activated);
        UserAccount user = activated.toUserAccount();
        AuthTokenPort.IssuedTokens tokens = tokenPort.issue(user);
        return new AuthenticationUseCase.AuthResult(tokens.accessToken(), tokens.refreshToken(), new AuthenticationUseCase.AuthUser(user.id(), user.name(), user.email(), user.roles()));
    }
}
