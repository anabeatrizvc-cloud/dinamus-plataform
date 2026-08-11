package com.dinamus.application.ports;

import com.dinamus.domain.model.MemberAccount;

public interface InvitationPort {
    void sendPasswordSetup(MemberAccount member);
}
