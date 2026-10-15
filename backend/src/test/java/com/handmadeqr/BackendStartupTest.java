package com.handmadeqr;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class BackendStartupTest {

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void flywayCreatesUsersWithUniqueGithubId() {
        jdbc.update("INSERT INTO users (id, github_id, login, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                UUID.randomUUID(), 4123L, "first");

        assertThrows(DuplicateKeyException.class, () -> jdbc.update(
                "INSERT INTO users (id, github_id, login, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                UUID.randomUUID(), 4123L, "second"));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE github_id = 4123", Integer.class));
    }
}
