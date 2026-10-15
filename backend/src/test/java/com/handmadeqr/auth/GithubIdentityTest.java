package com.handmadeqr.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.BigInteger;
import java.util.Map;

import org.junit.jupiter.api.Test;

class GithubIdentityTest {

    @Test
    void acceptsIntegralGithubIds() {
        assertEquals(42L, GithubIdentity.from(Map.of("id", 42, "login", "alice")).id());
        assertEquals(43L, GithubIdentity.from(Map.of("id", 43L, "login", "bob")).id());
    }

    @Test
    void rejectsMissingOrInvalidId() {
        assertThrows(IllegalArgumentException.class, () -> GithubIdentity.from(Map.of("login", "alice")));
        assertThrows(IllegalArgumentException.class, () -> GithubIdentity.from(Map.of("id", "42", "login", "alice")));
        assertThrows(IllegalArgumentException.class, () -> GithubIdentity.from(Map.of("id", -1, "login", "alice")));
        assertThrows(IllegalArgumentException.class,
                () -> GithubIdentity.from(Map.of("id", BigInteger.valueOf(Long.MAX_VALUE).add(BigInteger.ONE), "login", "alice")));
    }

    @Test
    void rejectsMissingOrBlankLogin() {
        assertThrows(IllegalArgumentException.class, () -> GithubIdentity.from(Map.of("id", 42)));
        assertThrows(IllegalArgumentException.class, () -> GithubIdentity.from(Map.of("id", 42, "login", "  ")));
    }
}
