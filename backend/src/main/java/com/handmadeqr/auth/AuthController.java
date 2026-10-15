package com.handmadeqr.auth;

import java.util.UUID;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class AuthController {

    private final UserAccountRepository accounts;

    public AuthController(UserAccountRepository accounts) {
        this.accounts = accounts;
    }

    @GetMapping("/api/me")
    public CurrentUserResponse me(@AuthenticationPrincipal OAuth2User principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        GithubIdentity identity = GithubIdentity.from(principal.getAttributes());
        UserAccount account = accounts.findByGithubId(identity.id())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        return new CurrentUserResponse(account.id(), account.login());
    }

    @GetMapping("/api/csrf")
    public ResponseEntity<CsrfResponse> csrf(CsrfToken csrfToken) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(new CsrfResponse(csrfToken.getHeaderName(), csrfToken.getToken()));
    }

    @GetMapping(value = "/auth/complete", produces = MediaType.TEXT_HTML_VALUE)
    public String complete() {
        return """
                <!doctype html><html lang="ko"><meta charset="utf-8"><title>로그인 완료</title>
                <p>로그인이 완료됐어요. 이 창이 닫히지 않으면 직접 닫아 주세요.</p>
                <script>window.close()</script></html>
                """;
    }

    @GetMapping(value = "/auth/failed", produces = MediaType.TEXT_HTML_VALUE)
    public String failed() {
        return """
                <!doctype html><html lang="ko"><meta charset="utf-8"><title>로그인 실패</title>
                <p>GitHub 로그인을 완료하지 못했어요. 이 창을 닫고 원래 화면에서 다시 시도해 주세요.</p>
                </html>
                """;
    }

    public record CurrentUserResponse(UUID id, String login) {
    }

    public record CsrfResponse(String headerName, String token) {
    }
}
