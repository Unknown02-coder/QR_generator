package com.handmadeqr.qr;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.UUID;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class QrPayloadCipher {

    private static final byte VERSION = 1;
    private static final int NONCE_LENGTH = 12;
    private static final int TAG_BITS = 128;

    private final SecretKeySpec key;
    private final SecureRandom random = new SecureRandom();

    public QrPayloadCipher(@Value("${qr.encryption-key}") String encodedKey) {
        byte[] decoded;
        try {
            decoded = Base64.getDecoder().decode(encodedKey);
        } catch (IllegalArgumentException error) {
            throw new IllegalArgumentException("QR encryption key must be Base64", error);
        }
        if (decoded.length != 32) {
            throw new IllegalArgumentException("QR encryption key must be 32 bytes");
        }
        this.key = new SecretKeySpec(decoded, "AES");
    }

    public byte[] encrypt(UUID ownerId, UUID qrId, String payload) {
        byte[] nonce = new byte[NONCE_LENGTH];
        random.nextBytes(nonce);
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, nonce));
            cipher.updateAAD(aad(ownerId, qrId));
            byte[] encrypted = cipher.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return ByteBuffer.allocate(1 + nonce.length + encrypted.length)
                    .put(VERSION).put(nonce).put(encrypted).array();
        } catch (GeneralSecurityException error) {
            throw new IllegalStateException("QR payload encryption failed", error);
        }
    }

    public String decrypt(UUID ownerId, UUID qrId, byte[] stored) {
        if (stored == null || stored.length < 1 + NONCE_LENGTH + TAG_BITS / 8 || stored[0] != VERSION) {
            throw new IllegalStateException("Unsupported QR payload ciphertext");
        }
        byte[] nonce = new byte[NONCE_LENGTH];
        System.arraycopy(stored, 1, nonce, 0, NONCE_LENGTH);
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, nonce));
            cipher.updateAAD(aad(ownerId, qrId));
            return new String(cipher.doFinal(stored, 1 + NONCE_LENGTH, stored.length - 1 - NONCE_LENGTH),
                    StandardCharsets.UTF_8);
        } catch (GeneralSecurityException error) {
            throw new IllegalStateException("QR payload decryption failed", error);
        }
    }

    private static byte[] aad(UUID ownerId, UUID qrId) {
        return ByteBuffer.allocate(32)
                .putLong(ownerId.getMostSignificantBits()).putLong(ownerId.getLeastSignificantBits())
                .putLong(qrId.getMostSignificantBits()).putLong(qrId.getLeastSignificantBits()).array();
    }
}
