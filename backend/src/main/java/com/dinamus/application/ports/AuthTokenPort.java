package com.dinamus.application.ports;

import com.dinamus.domain.model.UserAccount;

public interface AuthTokenPort {
    IssuedTokens issue(UserAccount user);

    record IssuedTokens(String accessToken, String refreshToken) {
    }
}
