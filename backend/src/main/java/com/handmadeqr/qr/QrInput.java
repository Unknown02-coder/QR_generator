package com.handmadeqr.qr;

import java.net.URI;

public record QrInput(String type, String title, String payload, String summary) {

    public static QrInput validated(String type, String title, String payload) {
        if (title == null || title.strip().isEmpty() || title.strip().length() > 80) {
            throw new IllegalArgumentException("QR title must contain 1 to 80 characters");
        }
        if (payload == null || payload.isBlank()) {
            throw new IllegalArgumentException("QR payload is required");
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
            case "wifi" -> (payload.startsWith("WIFI:T:WPA;") || payload.startsWith("WIFI:T:nopass;"))
                    && payload.contains(";S:") && payload.endsWith(";;");
            case "contact" -> payload.startsWith("BEGIN:VCARD\r\nVERSION:3.0\r\n")
                    && payload.contains("\r\nN:") && payload.contains("\r\nFN:")
                    && payload.endsWith("\r\nEND:VCARD");
            case "text" -> true;
            case "email" -> payload.startsWith("mailto:") && payload.substring(7).split("[?]", 2)[0].contains("@");
            default -> false;
        };
    }

    private static boolean validUrl(String payload) {
        if (payload.chars().anyMatch(Character::isWhitespace)) {
            return false;
        }
        try {
            URI uri = URI.create(payload);
            return ("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
                    && uri.getRawAuthority() != null && !uri.getRawAuthority().isBlank();
        } catch (IllegalArgumentException error) {
            return false;
        }
    }
}
