package com.handmadeqr.qr;

import java.time.Instant;
import java.util.UUID;

public record SavedQr(UUID id, String type, String title, String summary, Instant createdAt) {
}
