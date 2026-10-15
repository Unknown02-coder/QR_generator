package com.handmadeqr.auth;

import java.util.Map;

public record GithubIdentity(long id, String login) {

    public static GithubIdentity from(Map<String, Object> attributes) {
        Object rawId = attributes.get("id");
        Object rawLogin = attributes.get("login");
        if (!(rawId instanceof Number) || rawId instanceof Float || rawId instanceof Double) {
            throw new IllegalArgumentException("Invalid GitHub user id");
        }
        long id;
        try {
            id = Long.parseLong(rawId.toString());
        } catch (NumberFormatException error) {
            throw new IllegalArgumentException("Invalid GitHub user id", error);
        }
        if (id <= 0 || !(rawLogin instanceof String login) || login.isBlank()) {
            throw new IllegalArgumentException("Invalid GitHub user attributes");
        }
        return new GithubIdentity(id, login);
    }
}
