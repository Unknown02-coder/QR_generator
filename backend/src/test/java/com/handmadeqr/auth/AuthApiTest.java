package com.handmadeqr.auth;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthApiTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    UserAccountRepository accounts;

    @Autowired
    ObjectMapper mapper;

    @Test
    void meReturnsOnlyInternalIdAndLogin() throws Exception {
        UserAccount account = accounts.upsert(new GithubIdentity(5101L, "alice"));
        MockHttpSession session = authenticatedSession(5101L, "alice");

        mvc.perform(get("/api/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(account.id().toString()))
                .andExpect(jsonPath("$.login").value("alice"))
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void csrfResponseTokenWorksForLogoutAndSessionEnds() throws Exception {
        accounts.upsert(new GithubIdentity(5102L, "bob"));
        MockHttpSession session = authenticatedSession(5102L, "bob");
        var csrfResponse = mvc.perform(get("/api/csrf").session(session))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", containsString("no-store")))
                .andReturn().getResponse();
        JsonNode csrf = mapper.readTree(csrfResponse.getContentAsString());
        String headerName = csrf.get("headerName").asText();
        String token = csrf.get("token").asText();
        assertEquals("X-CSRF-TOKEN", headerName);
        assertNotNull(token);

        mvc.perform(post("/logout").session(session).header(headerName, token))
                .andExpect(status().isNoContent());
        assertTrue(session.isInvalid());
        mvc.perform(get("/api/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void logoutRejectsMissingOrInvalidCsrf() throws Exception {
        MockHttpSession session = authenticatedSession(5103L, "carol");
        mvc.perform(get("/api/csrf").session(session)).andExpect(status().isOk());

        mvc.perform(post("/logout").session(session)).andExpect(status().isForbidden());
        mvc.perform(post("/logout").session(session).header("X-CSRF-TOKEN", "wrong"))
                .andExpect(status().isForbidden());
    }

    @Test
    void popupPagesContainNoPrincipalData() throws Exception {
        String success = mvc.perform(get("/auth/complete")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String failure = mvc.perform(get("/auth/failed")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertTrue(success.contains("window.close()"));
        assertTrue(failure.contains("다시"));
        assertTrue(!success.contains("client-secret") && !failure.contains("client-secret"));
    }

    private MockHttpSession authenticatedSession(long githubId, String login) {
        var user = new DefaultOAuth2User(List.of(new SimpleGrantedAuthority("ROLE_USER")),
                Map.of("id", githubId, "login", login), "id");
        var authentication = new OAuth2AuthenticationToken(user, user.getAuthorities(), "github");
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        var session = new MockHttpSession();
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);
        return session;
    }
}
