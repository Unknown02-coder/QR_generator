package com.handmadeqr.auth;

import java.util.UUID;

public record UserAccount(UUID id, long githubId, String login) {
}
