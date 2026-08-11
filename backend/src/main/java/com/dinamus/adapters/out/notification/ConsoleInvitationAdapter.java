package com.dinamus.adapters.out.notification;

import com.dinamus.application.ports.InvitationPort;
import com.dinamus.domain.model.MemberAccount;
import jakarta.inject.Singleton;

@Singleton
public class ConsoleInvitationAdapter implements InvitationPort {
    @Override
    public void sendPasswordSetup(MemberAccount member) {
        if (member.email().isBlank() || member.passwordSetupToken().isBlank()) {
            return;
        }
        System.out.printf("DNMS invite for %s: /setup-password?token=%s%n", member.email(), member.passwordSetupToken());
    }
}
