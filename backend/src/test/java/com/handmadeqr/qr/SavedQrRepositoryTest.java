package com.handmadeqr.qr;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import com.handmadeqr.auth.GithubIdentity;
import com.handmadeqr.auth.UserAccountRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class SavedQrRepositoryTest {

    @Autowired
    SavedQrRepository qrs;

    @Autowired
    UserAccountRepository accounts;

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void storesCiphertextAndOnlyOwnersCanReadPayload() {
        UUID owner = accounts.upsert(new GithubIdentity(20101L, "storage-owner")).id();
        UUID other = accounts.upsert(new GithubIdentity(20102L, "storage-other")).id();
        String secret = "WIFI:T:WPA;S:Cafe;P:very-secret;;";

        SavedQr saved = qrs.save(owner, QrInput.validated("wifi", "Cafe", secret));
        byte[] stored = jdbc.queryForObject("SELECT encrypted_payload FROM saved_qrs WHERE id = ?",
                byte[].class, saved.id());

        assertFalse(new String(stored, StandardCharsets.UTF_8).contains(secret));
        assertEquals(secret, qrs.findPayload(owner, saved.id()).orElseThrow());
        assertTrue(qrs.findPayload(other, saved.id()).isEmpty());
        assertEquals("네트워크 정보", qrs.page(owner, 1, null).items().getFirst().summary());
        assertTrue(qrs.page(other, 1, null).items().isEmpty());
    }

    @Test
    void pagesByNewestAndFiltersByType() {
        UUID owner = accounts.upsert(new GithubIdentity(20103L, "paging-owner")).id();
        for (int i = 0; i < 12; i++) {
            String type = i % 2 == 0 ? "text" : "url";
            String payload = type.equals("text") ? "message " + i : "https://example.com/" + i;
            qrs.save(owner, QrInput.validated(type, "item " + i, payload));
        }

        QrPage first = qrs.page(owner, 1, null);
        QrPage second = qrs.page(owner, 2, null);
        QrPage third = qrs.page(owner, 3, null);
        assertEquals(12, first.total());
        assertEquals(1, first.page());
        assertEquals(5, first.pageSize());
        assertEquals(List.of(5, 5, 2), List.of(first.items().size(), second.items().size(), third.items().size()));
        assertEquals(6, qrs.page(owner, 1, "url").total());
        assertTrue(qrs.page(owner, 4, null).items().isEmpty());

        jdbc.update("UPDATE saved_qrs SET created_at = CURRENT_TIMESTAMP WHERE owner_id = ?", owner);
        List<UUID> expected = jdbc.query("SELECT id FROM saved_qrs WHERE owner_id = ? ORDER BY created_at DESC, id DESC LIMIT 5",
                (rs, row) -> rs.getObject(1, UUID.class), owner);
        assertEquals(expected, qrs.page(owner, 1, null).items().stream().map(SavedQr::id).toList());
        assertEquals(expected, qrs.page(owner, 1, null).items().stream().map(SavedQr::id).toList());
    }
}
