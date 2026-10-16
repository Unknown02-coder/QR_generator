package com.handmadeqr.qr;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Base64;
import java.util.UUID;

import org.junit.jupiter.api.Test;

class QrPayloadCipherTest {

    private final String testKey = Base64.getEncoder().encodeToString(new byte[32]);

    @Test
    void roundTripUsesDifferentNonceEachTime() {
        QrPayloadCipher cipher = new QrPayloadCipher(testKey);
        UUID owner = UUID.randomUUID();
        UUID qr = UUID.randomUUID();
        String payload = "WIFI:T:WPA;S:카페;P:secret;;";

        byte[] first = cipher.encrypt(owner, qr, payload);
        byte[] second = cipher.encrypt(owner, qr, payload);

        assertEquals(payload, cipher.decrypt(owner, qr, first));
        assertEquals(payload, cipher.decrypt(owner, qr, second));
        assertNotEquals(Base64.getEncoder().encodeToString(first), Base64.getEncoder().encodeToString(second));
    }

    @Test
    void copiedCiphertextCannotBeReadByAnotherOwnerOrQr() {
        QrPayloadCipher cipher = new QrPayloadCipher(testKey);
        UUID owner = UUID.randomUUID();
        UUID qr = UUID.randomUUID();
        byte[] stored = cipher.encrypt(owner, qr, "private content");

        assertThrows(IllegalStateException.class, () -> cipher.decrypt(UUID.randomUUID(), qr, stored));
        assertThrows(IllegalStateException.class, () -> cipher.decrypt(owner, UUID.randomUUID(), stored));
    }

    @Test
    void missingOrWrongLengthKeyIsRejected() {
        assertThrows(IllegalArgumentException.class, () -> new QrPayloadCipher(""));
        assertThrows(IllegalArgumentException.class,
                () -> new QrPayloadCipher(Base64.getEncoder().encodeToString(new byte[16])));
    }
}
