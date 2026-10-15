package com.handmadeqr.auth;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class UserAccountRepository {

    private final JdbcTemplate jdbc;

    public UserAccountRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public UserAccount upsert(GithubIdentity identity) {
        jdbc.update("""
                INSERT INTO users (id, github_id, login, created_at, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT DO NOTHING
                """, UUID.randomUUID(), identity.id(), identity.login());
        jdbc.update("""
                UPDATE users SET login = ?, updated_at = CURRENT_TIMESTAMP
                WHERE github_id = ? AND login <> ?
                """, identity.login(), identity.id(), identity.login());
        return findByGithubId(identity.id())
                .orElseThrow(() -> new IllegalStateException("GitHub user was not saved"));
    }

    public Optional<UserAccount> findByGithubId(long githubId) {
        List<UserAccount> users = jdbc.query("SELECT id, github_id, login FROM users WHERE github_id = ?",
                (rs, rowNum) -> new UserAccount(rs.getObject("id", UUID.class), rs.getLong("github_id"), rs.getString("login")),
                githubId);
        return users.stream().findFirst();
    }
}
