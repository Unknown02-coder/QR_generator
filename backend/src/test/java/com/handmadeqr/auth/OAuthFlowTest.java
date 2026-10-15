package com.handmadeqr.auth;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.util.UriComponentsBuilder;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OAuthFlowTest {

    private static final AtomicReference<String> userBody = new AtomicReference<>("{\"id\":7123,\"login\":\"alice\"}");
    private static final AtomicReference<String> tokenRequest = new AtomicReference<>("");
    private static final HttpServer provider = startProvider();

    @Autowired
    MockMvc mvc;

    @MockitoBean
    UserAccountRepository accounts;

    @DynamicPropertySource
    static void providerProperties(DynamicPropertyRegistry properties) {
        String base = "http://127.0.0.1:" + provider.getAddress().getPort();
        properties.add("spring.security.oauth2.client.provider.github.authorization-uri", () -> base + "/authorize");
        properties.add("spring.security.oauth2.client.provider.github.token-uri", () -> base + "/token");
        properties.add("spring.security.oauth2.client.provider.github.user-info-uri", () -> base + "/user");
        properties.add("spring.security.oauth2.client.provider.github.user-name-attribute", () -> "id");
    }

    @AfterAll
    static void closeProvider() {
        provider.stop(0);
    }

    @BeforeEach
    void resetProvider() {
        userBody.set("{\"id\":7123,\"login\":\"alice\"}");
        tokenRequest.set("");
    }

    @Test
    void fullOAuthCallbackCreatesUsableSession() throws Exception {
        UUID id = UUID.randomUUID();
        UserAccount account = new UserAccount(id, 7123L, "alice");
        when(accounts.upsert(new GithubIdentity(7123L, "alice"))).thenReturn(account);
        when(accounts.findByGithubId(7123L)).thenReturn(Optional.of(account));

        LoginStart start = startLogin();
        mvc.perform(get("/login/oauth2/code/github").session(start.session())
                        .param("state", start.state()).param("code", "approved"))
                .andExpect(status().is3xxRedirection())
                .andExpect(header().string("Location", "/auth/complete"));
        mvc.perform(get("/api/me").session(start.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.login").value("alice"));
        assertTrue(tokenRequest.get().contains("code_verifier="));
    }

    @Test
    void wrongStateDoesNotCreateSession() throws Exception {
        LoginStart start = startLogin();
        mvc.perform(get("/login/oauth2/code/github").session(start.session())
                        .param("state", "incorrect").param("code", "approved"))
                .andExpect(status().is3xxRedirection())
                .andExpect(header().string("Location", "/auth/failed"));
        mvc.perform(get("/api/me").session(start.session())).andExpect(status().isUnauthorized());
    }

    @Test
    void databaseFailureDoesNotCreateSession() throws Exception {
        when(accounts.upsert(any())).thenThrow(new DataAccessResourceFailureException("database unavailable"));

        LoginStart start = startLogin();
        mvc.perform(get("/login/oauth2/code/github").session(start.session())
                        .param("state", start.state()).param("code", "approved"))
                .andExpect(status().is3xxRedirection())
                .andExpect(header().string("Location", "/auth/failed"));
        mvc.perform(get("/api/me").session(start.session())).andExpect(status().isUnauthorized());
    }

    @Test
    void twoGithubAccountsReceiveDifferentInternalIds() throws Exception {
        UserAccount alice = new UserAccount(UUID.randomUUID(), 7123L, "alice");
        UserAccount bob = new UserAccount(UUID.randomUUID(), 7124L, "bob");
        when(accounts.upsert(new GithubIdentity(7123L, "alice"))).thenReturn(alice);
        when(accounts.findByGithubId(7123L)).thenReturn(Optional.of(alice));
        when(accounts.upsert(new GithubIdentity(7124L, "bob"))).thenReturn(bob);
        when(accounts.findByGithubId(7124L)).thenReturn(Optional.of(bob));

        LoginStart first = startLogin();
        mvc.perform(get("/login/oauth2/code/github").session(first.session())
                .param("state", first.state()).param("code", "approved"))
                .andExpect(header().string("Location", "/auth/complete"));
        userBody.set("{\"id\":7124,\"login\":\"bob\"}");
        LoginStart second = startLogin();
        mvc.perform(get("/login/oauth2/code/github").session(second.session())
                .param("state", second.state()).param("code", "approved"))
                .andExpect(header().string("Location", "/auth/complete"));

        assertNotEquals(alice.id(), bob.id());
        mvc.perform(get("/api/me").session(first.session())).andExpect(jsonPath("$.id").value(alice.id().toString()));
        mvc.perform(get("/api/me").session(second.session())).andExpect(jsonPath("$.id").value(bob.id().toString()));
    }

    private LoginStart startLogin() throws Exception {
        var result = mvc.perform(get("/oauth2/authorization/github")).andReturn();
        String location = result.getResponse().getHeader("Location");
        assertNotNull(location);
        String encodedState = UriComponentsBuilder.fromUri(URI.create(location)).build().getQueryParams().getFirst("state");
        String state = URLDecoder.decode(encodedState, StandardCharsets.UTF_8);
        assertNotNull(state);
        return new LoginStart((MockHttpSession) result.getRequest().getSession(false), state);
    }

    private record LoginStart(MockHttpSession session, String state) {
    }

    private static HttpServer startProvider() {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/token", exchange -> {
                tokenRequest.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
                respond(exchange, "{\"access_token\":\"fake-token\",\"token_type\":\"bearer\"}");
            });
            server.createContext("/user", exchange -> respond(exchange, userBody.get()));
            server.start();
            return server;
        } catch (IOException error) {
            throw new IllegalStateException("Cannot start local OAuth provider", error);
        }
    }

    private static void respond(HttpExchange exchange, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(200, bytes.length);
        try (var stream = exchange.getResponseBody()) {
            stream.write(bytes);
        }
    }
}
