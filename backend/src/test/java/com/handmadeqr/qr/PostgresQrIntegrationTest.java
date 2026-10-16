package com.handmadeqr.qr;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.nio.charset.StandardCharsets;

import com.handmadeqr.auth.GithubIdentity;
import com.handmadeqr.auth.UserAccountRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
class PostgresQrIntegrationTest {

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:16-alpine");

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", postgres::getJdbcUrl);
        properties.add("spring.datasource.username", postgres::getUsername);
        properties.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    UserAccountRepository accounts;

    @Autowired
    SavedQrRepository qrs;

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void flywayStoresEncryptedPayloadInPostgresBytea() {
        var owner = accounts.upsert(new GithubIdentity(39101L, "postgres-owner")).id();
        String payload = "WIFI:T:WPA;S:Cafe;P:postgres-secret;;";
        SavedQr saved = qrs.save(owner, QrInput.validated("wifi", "Cafe", payload));

        byte[] stored = jdbc.queryForObject("SELECT encrypted_payload FROM saved_qrs WHERE id = ?",
                byte[].class, saved.id());
        assertFalse(new String(stored, StandardCharsets.UTF_8).contains(payload));
        assertEquals(payload, qrs.findPayload(owner, saved.id()).orElseThrow());
        assertEquals(1, qrs.page(owner, 1, "wifi").total());
    }
}
