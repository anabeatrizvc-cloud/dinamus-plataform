package com.dinamus.application.ports;

import com.dinamus.domain.model.MemberAccount;
import com.dinamus.domain.model.UserAccount;

import java.util.List;
import java.util.Optional;

public interface IdentityRepository {
    Optional<UserAccount> findUserByEmail(String email);

    Optional<MemberAccount> findMemberByEmail(String email);

    Optional<MemberAccount> findMemberById(String id);

    Optional<MemberAccount> findMemberBySetupToken(String token);

    List<MemberAccount> listMembers();

    MemberAccount saveMember(MemberAccount member);

    void deleteMember(String id);
}
