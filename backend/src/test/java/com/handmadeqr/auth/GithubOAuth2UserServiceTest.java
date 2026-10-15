package com.handmadeqr.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;

class GithubOAuth2UserServiceTest {

    @Test
    void storesUserBeforeReturningAuthenticatedPrincipal() {
        UserAccountRepository accounts = mock(UserAccountRepository.class);
        OAuth2User user = githubUser(Map.of("id", 42, "login", "alice"));
        OAuth2UserService<OAuth2UserRequest, OAuth2User> delegate = ignored -> user;
        when(accounts.upsert(new GithubIdentity(42, "alice")))
                .thenReturn(new UserAccount(UUID.randomUUID(), 42, "alice"));

        OAuth2User result = new GithubOAuth2UserService(delegate, accounts).loadUser(mock(OAuth2UserRequest.class));

        assertEquals(user, result);
        verify(accounts).upsert(new GithubIdentity(42, "alice"));
    }

    @Test
    void databaseFailureRejectsAuthentication() {
        UserAccountRepository accounts = mock(UserAccountRepository.class);
        OAuth2UserService<OAuth2UserRequest, OAuth2User> delegate = ignored -> githubUser(Map.of("id", 42, "login", "alice"));
        when(accounts.upsert(any())).thenThrow(new DataAccessResourceFailureException("database unavailable"));

        assertThrows(OAuth2AuthenticationException.class,
                () -> new GithubOAuth2UserService(delegate, accounts).loadUser(mock(OAuth2UserRequest.class)));
    }

    private OAuth2User githubUser(Map<String, Object> attributes) {
        return new DefaultOAuth2User(List.of(new SimpleGrantedAuthority("ROLE_USER")), attributes, "id");
    }
}
