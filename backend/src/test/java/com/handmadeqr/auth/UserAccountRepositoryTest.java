package com.handmadeqr.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class UserAccountRepositoryTest {

    @Autowired
    UserAccountRepository accounts;

    @Test
    void reusingGithubIdKeepsInternalIdAndUpdatesLogin() {
        UserAccount first = accounts.upsert(new GithubIdentity(1001L, "old-name"));
        UserAccount again = accounts.upsert(new GithubIdentity(1001L, "new-name"));

        assertEquals(first.id(), again.id());
        assertEquals("new-name", again.login());
        assertEquals(again, accounts.findByGithubId(1001L).orElseThrow());
    }

    @Test
    void differentGithubIdsHaveDifferentInternalIds() {
        UserAccount first = accounts.upsert(new GithubIdentity(2001L, "alice"));
        UserAccount second = accounts.upsert(new GithubIdentity(2002L, "bob"));

        assertNotEquals(first.id(), second.id());
        assertTrue(accounts.findByGithubId(999999L).isEmpty());
    }
}
