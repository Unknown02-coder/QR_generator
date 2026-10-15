package com.handmadeqr.auth;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.net.URI;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.util.UriComponentsBuilder;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OAuthSecurityTest {

    @Autowired
    MockMvc mvc;

    @Test
    void authorizationUsesServerCallbackAndPkceWithoutRepoScope() throws Exception {
        String location = mvc.perform(get("/oauth2/authorization/github")
                        .with(request -> { request.setServerName("127.0.0.1"); request.setServerPort(5173); return request; }))
                .andExpect(status().is3xxRedirection())
                .andReturn().getResponse().getHeader("Location");

        assertNotNull(location);
        var params = UriComponentsBuilder.fromUri(URI.create(location)).build().getQueryParams();
        assertEquals("http://127.0.0.1:8080/login/oauth2/code/github", params.getFirst("redirect_uri"));
        assertEquals("S256", params.getFirst("code_challenge_method"));
        assertNotNull(params.getFirst("code_challenge"));
        assertNotNull(params.getFirst("state"));
        String scope = params.getFirst("scope");
        assertFalse(scope != null && java.util.Arrays.asList(scope.split("\\s+")).contains("repo"));
    }

    @Test
    void unauthenticatedApiReturnsJson401InsteadOfLoginPage() throws Exception {
        mvc.perform(get("/api/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("Content-Type", containsString("application/json")))
                .andExpect(content().string(not(containsString("<html"))));
        mvc.perform(get("/api/qrs"))
                .andExpect(status().isUnauthorized());
    }
}
