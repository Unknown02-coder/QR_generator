package com.handmadeqr.qr;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class QrInputTest {

    @Test
    void acceptsFiveTypesAndNeverUsesPayloadAsSummary() {
        String[][] cases = {
                { "url", "https://example.com/private", "웹 주소" },
                { "wifi", "WIFI:T:WPA;S:Cafe;P:secret;;", "네트워크 정보" },
                { "contact", "BEGIN:VCARD\r\nVERSION:3.0\r\nN:Kim;Minji;;;\r\nFN:Kim Minji\r\nEND:VCARD", "연락처 정보" },
                { "text", "private text", "텍스트 QR" },
                { "email", "mailto:hello@example.com?subject=secret", "이메일 QR" }
        };
        for (String[] item : cases) {
            QrInput input = QrInput.validated(item[0], "  내 QR  ", item[1]);
            assertEquals("내 QR", input.title());
            assertEquals(item[0], input.type());
            assertEquals(item[1], input.payload());
            assertEquals(item[2], input.summary());
        }
    }

    @Test
    void rejectsMissingTitleAndMismatchedPayload() {
        assertThrows(IllegalArgumentException.class, () -> QrInput.validated("text", "   ", "hello"));
        assertThrows(IllegalArgumentException.class, () -> QrInput.validated("text", "a".repeat(81), "hello"));
        assertThrows(IllegalArgumentException.class, () -> QrInput.validated("other", "title", "hello"));
        assertThrows(IllegalArgumentException.class, () -> QrInput.validated("wifi", "title", "mailto:hello@example.com"));
        assertThrows(IllegalArgumentException.class, () -> QrInput.validated("url", "title", "ftp://example.com"));
        assertThrows(IllegalArgumentException.class, () -> QrInput.validated("text", "title", " \n "));
    }
}
