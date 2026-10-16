package com.handmadeqr.qr;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class SavedQrRepository {

    private static final int PAGE_SIZE = 5;

    private final JdbcTemplate jdbc;
    private final QrPayloadCipher cipher;

    public SavedQrRepository(JdbcTemplate jdbc, QrPayloadCipher cipher) {
        this.jdbc = jdbc;
        this.cipher = cipher;
    }

    public SavedQr save(UUID ownerId, QrInput input) {
        UUID id = UUID.randomUUID();
        Instant createdAt = Instant.now();
        jdbc.update("""
                INSERT INTO saved_qrs (id, owner_id, type, title, encrypted_payload, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """, id, ownerId, input.type(), input.title(), cipher.encrypt(ownerId, id, input.payload()),
                OffsetDateTime.ofInstant(createdAt, ZoneOffset.UTC));
        return new SavedQr(id, input.type(), input.title(), input.summary(), createdAt);
    }

    public QrPage page(UUID ownerId, int page, String type) {
        if (page < 1 || page > Integer.MAX_VALUE / PAGE_SIZE) {
            throw new IllegalArgumentException("Invalid QR page");
        }
        if (type != null) {
            QrInput.summaryFor(type);
        }
        String where = " WHERE owner_id = ?" + (type == null ? "" : " AND type = ?");
        Object[] countArgs = type == null ? new Object[] { ownerId } : new Object[] { ownerId, type };
        long total = jdbc.queryForObject("SELECT COUNT(*) FROM saved_qrs" + where, Long.class, countArgs);
        Object[] itemArgs = type == null
                ? new Object[] { ownerId, PAGE_SIZE, (page - 1) * PAGE_SIZE }
                : new Object[] { ownerId, type, PAGE_SIZE, (page - 1) * PAGE_SIZE };
        List<SavedQr> items = jdbc.query("""
                SELECT id, type, title, created_at FROM saved_qrs
                """ + where + " ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?",
                (rs, row) -> {
                    String savedType = rs.getString("type");
                    return new SavedQr(rs.getObject("id", UUID.class), savedType, rs.getString("title"),
                            QrInput.summaryFor(savedType), rs.getTimestamp("created_at").toInstant());
                }, itemArgs);
        return new QrPage(items, total, page, PAGE_SIZE);
    }

    public Optional<String> findPayload(UUID ownerId, UUID qrId) {
        List<byte[]> found = jdbc.query("SELECT encrypted_payload FROM saved_qrs WHERE id = ? AND owner_id = ?",
                (rs, row) -> rs.getBytes("encrypted_payload"), qrId, ownerId);
        return found.stream().findFirst().map(stored -> cipher.decrypt(ownerId, qrId, stored));
    }
}
