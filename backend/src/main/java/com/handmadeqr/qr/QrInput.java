package com.handmadeqr.qr;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;

public record QrInput(String type, String title, String payload, String summary) {

    private static final Pattern WIFI_OPEN = Pattern.compile("WIFI:T:nopass;S:(?:\\\\.|[^;\\r\\n])+;;");
    private static final Pattern WIFI_PASSWORD = Pattern.compile("WIFI:T:WPA;S:(?:\\\\.|[^;\\r\\n])+;P:(?:\\\\.|[^;\\r\\n])+;;");
    private static final Pattern EMAIL = Pattern.compile("[^\\s@]+@[^\\s@]+\\.[^\\s@]+");
    private static final Pattern CONTACT_NAME = Pattern.compile("(?:^|\\r\\n)FN:([^\\r\\n]+)(?:\\r\\n|$)");

    public static QrInput validated(String type, String title, String payload) {
        if (title == null || title.strip().isEmpty() || title.strip().length() > 80) {
            throw new IllegalArgumentException("QR title must contain 1 to 80 characters");
        }
        if (payload == null || payload.isBlank()) {
            throw new IllegalArgumentException("QR payload is required");
        }
        if (payload.length() > 8192 || payload.getBytes(StandardCharsets.UTF_8).length > 8192) {
            throw new IllegalArgumentException("QR payload is too large");
        }
        String summary = switch (type == null ? "" : type) {
            case "url" -> "웹 주소";
            case "wifi" -> "네트워크 정보";
            case "contact" -> "연락처 정보";
            case "text" -> "텍스트 QR";
            case "email" -> "이메일 QR";
            default -> throw new IllegalArgumentException("Unsupported QR type");
        };
        if (!matchesType(type, payload)) {
            throw new IllegalArgumentException("QR payload does not match type");
        }
        return new QrInput(type, title.strip(), payload, summary);
    }

    public static String summaryFor(String type) {
        return switch (type) {
            case "url" -> "웹 주소";
            case "wifi" -> "네트워크 정보";
            case "contact" -> "연락처 정보";
            case "text" -> "텍스트 QR";
            case "email" -> "이메일 QR";
            default -> throw new IllegalArgumentException("Unsupported QR type");
        };
    }

    private static boolean matchesType(String type, String payload) {
        return switch (type) {
            case "url" -> validUrl(payload);
            case "wifi" -> WIFI_OPEN.matcher(payload).matches() || WIFI_PASSWORD.matcher(payload).matches();
            case "contact" -> payload.startsWith("BEGIN:VCARD\r\nVERSION:3.0\r\n")
                    && payload.contains("\r\nN:") && payload.contains("\r\nFN:")
                    && payload.endsWith("\r\nEND:VCARD") && CONTACT_NAME.matcher(payload).find();
            case "text" -> true;
            case "email" -> payload.startsWith("mailto:")
                    && EMAIL.matcher(payload.substring(7).split("[?]", 2)[0]).matches();
            default -> false;
        };
    }

    private static boolean validUrl(String payload) {
        if (payload.chars().anyMatch(Character::isWhitespace)) {
            return false;
        }
        try {
            URI uri = URI.create(payload);
            String authority = uri.getRawAuthority();
            return ("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
                    && authority != null && !authority.isBlank() && !authority.startsWith("@")
                    && (uri.getHost() != null
                            || authority.codePoints().anyMatch(c -> c > 127 && Character.isLetter(c)));
        } catch (IllegalArgumentException error) {
            return false;
        }
    }
}
