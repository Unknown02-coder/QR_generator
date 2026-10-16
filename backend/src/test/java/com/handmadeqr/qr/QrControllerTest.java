package com.handmadeqr.qr;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.ByteArrayInputStream;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import javax.imageio.ImageIO;

import com.google.zxing.BinaryBitmap;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.client.j2se.BufferedImageLuminanceSource;
import com.google.zxing.common.HybridBinarizer;
import com.handmadeqr.auth.GithubIdentity;
import com.handmadeqr.auth.UserAccountRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class QrControllerTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    UserAccountRepository accounts;

    @Autowired
    ObjectMapper mapper;

    @Test
    void saveListAndPreviewUseOnlyOwnersStoredPayload() throws Exception {
        MockHttpSession owner = session(30101L, "owner");
        MockHttpSession other = session(30102L, "other");
        String payload = "WIFI:T:WPA;S:카페;P:private123;;";
        String json = mapper.writeValueAsString(Map.of("type", "wifi", "title", "카페", "payload", payload));
        String token = csrf(owner);

        String body = mvc.perform(post("/api/qrs").session(owner).contentType(MediaType.APPLICATION_JSON)
                        .header("X-CSRF-TOKEN", token).content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("wifi"))
                .andExpect(jsonPath("$.summary").value("네트워크 정보"))
                .andReturn().getResponse().getContentAsString();
        assertFalse(body.contains(payload));
        String id = mapper.readTree(body).get("id").asText();
        Instant.parse(mapper.readTree(body).get("createdAt").asText());

        String listBody = mvc.perform(get("/api/qrs?page=1&size=5").session(owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].id").value(id))
                .andExpect(jsonPath("$.items[0].summary").value("네트워크 정보"))
                .andReturn().getResponse().getContentAsString();
        assertFalse(listBody.contains(payload));
        mvc.perform(get("/api/qrs?page=1&size=5").session(other))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0));

        byte[] png = mvc.perform(get("/api/qrs/{id}/preview", id).session(owner))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", containsString("image/png")))
                .andExpect(header().string("Cache-Control", containsString("no-store")))
                .andReturn().getResponse().getContentAsByteArray();
        var image = ImageIO.read(new ByteArrayInputStream(png));
        assertEquals(256, image.getWidth());
        assertEquals(payload, new MultiFormatReader().decode(new BinaryBitmap(
                new HybridBinarizer(new BufferedImageLuminanceSource(image)))).getText());
        mvc.perform(get("/api/qrs/{id}/preview", id).session(other)).andExpect(status().isNotFound());
        mvc.perform(get("/api/qrs/{id}/preview", UUID.randomUUID()).session(owner)).andExpect(status().isNotFound());
    }

    @Test
    void saveRequiresSessionAndCsrf() throws Exception {
        MockHttpSession owner = session(30103L, "csrf-owner");
        String json = mapper.writeValueAsString(Map.of("type", "text", "title", "Hello", "payload", "Hello"));
        mvc.perform(post("/api/qrs").with(SecurityMockMvcRequestPostProcessors.csrf())
                .contentType(MediaType.APPLICATION_JSON).content(json)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/qrs").session(owner).contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/qrs")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/qrs/" + UUID.randomUUID() + "/preview")).andExpect(status().isUnauthorized());
    }

    @Test
    void badInputAndQueryReturn400() throws Exception {
        MockHttpSession owner = session(30104L, "invalid-owner");
        String token = csrf(owner);
        for (Map<String, String> input : List.of(
                Map.of("type", "other", "title", "Title", "payload", "hello"),
                Map.of("type", "text", "title", " ", "payload", "hello"),
                Map.of("type", "wifi", "title", "Title", "payload", "mailto:a@example.com"),
                Map.of("type", "text", "title", "Title", "payload", "x".repeat(5000)))) {
            mvc.perform(post("/api/qrs").session(owner).header("X-CSRF-TOKEN", token)
                            .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(input)))
                    .andExpect(status().isBadRequest());
        }
        mvc.perform(get("/api/qrs?page=0").session(owner)).andExpect(status().isBadRequest());
        mvc.perform(get("/api/qrs?size=10").session(owner)).andExpect(status().isBadRequest());
        mvc.perform(get("/api/qrs?type=other").session(owner)).andExpect(status().isBadRequest());
    }

    private String csrf(MockHttpSession session) throws Exception {
        String body = mvc.perform(get("/api/csrf").session(session)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return mapper.readTree(body).get("token").asText();
    }

    private MockHttpSession session(long githubId, String login) {
        accounts.upsert(new GithubIdentity(githubId, login));
        var principal = new DefaultOAuth2User(List.of(new SimpleGrantedAuthority("ROLE_USER")),
                Map.of("id", githubId, "login", login), "id");
        var authentication = new OAuth2AuthenticationToken(principal, principal.getAuthorities(), "github");
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        MockHttpSession session = new MockHttpSession();
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);
        return session;
    }
}
