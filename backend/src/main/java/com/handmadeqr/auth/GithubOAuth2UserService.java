package com.handmadeqr.auth;

import org.springframework.dao.DataAccessException;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.user.OAuth2User;

public class GithubOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

    private final OAuth2UserService<OAuth2UserRequest, OAuth2User> delegate;
    private final UserAccountRepository accounts;

    public GithubOAuth2UserService(UserAccountRepository accounts) {
        this(new DefaultOAuth2UserService(), accounts);
    }

    public GithubOAuth2UserService(OAuth2UserService<OAuth2UserRequest, OAuth2User> delegate,
            UserAccountRepository accounts) {
        this.delegate = delegate;
        this.accounts = accounts;
    }

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User user = delegate.loadUser(userRequest);
        try {
            accounts.upsert(GithubIdentity.from(user.getAttributes()));
        } catch (IllegalArgumentException | DataAccessException error) {
            throw new OAuth2AuthenticationException(new OAuth2Error("github_user_unavailable"),
                    "GitHub user could not be saved", error);
        }
        return user;
    }
}
