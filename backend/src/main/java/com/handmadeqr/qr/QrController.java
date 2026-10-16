package com.handmadeqr.qr;

import java.util.Map;
import java.util.UUID;

import com.handmadeqr.auth.GithubIdentity;
import com.handmadeqr.auth.UserAccountRepository;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/qrs")
public class QrController {

    private final UserAccountRepository accounts;
    private final SavedQrRepository qrs;
    private final QrImage image;

    public QrController(UserAccountRepository accounts, SavedQrRepository qrs, QrImage image) {
        this.accounts = accounts;
        this.qrs = qrs;
        this.image = image;
    }

    @PostMapping
    public ResponseEntity<SavedQr> save(@AuthenticationPrincipal OAuth2User principal,
            @RequestBody SaveQrRequest request) {
        UUID ownerId = ownerId(principal);
        QrInput input = QrInput.validated(request.type(), request.title(), request.payload());
        image.validate(input.payload());
        return ResponseEntity.status(HttpStatus.CREATED).body(qrs.save(ownerId, input));
    }

    @GetMapping
    public QrPage list(@AuthenticationPrincipal OAuth2User principal,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int size,
            @RequestParam(required = false) String type) {
        if (size != 5) {
            throw new IllegalArgumentException("QR page size must be 5");
        }
        return qrs.page(ownerId(principal), page, type);
    }

    @GetMapping(value = "/{id}/preview", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> preview(@AuthenticationPrincipal OAuth2User principal,
            @PathVariable UUID id) {
        String payload = qrs.findPayload(ownerId(principal), id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .contentType(MediaType.IMAGE_PNG)
                .body(image.png(payload, 256));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<byte[]> download(@AuthenticationPrincipal OAuth2User principal,
            @PathVariable UUID id, @RequestParam(required = false) String format) {
        if (!"png".equals(format) && !"svg".equals(format)) {
            throw new IllegalArgumentException("Unsupported QR download format");
        }
        StoredQr stored = qrs.findOwned(ownerId(principal), id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        QrInput.summaryFor(stored.type());
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"qr-" + stored.type() + "." + format + "\"")
                .contentType("png".equals(format) ? MediaType.IMAGE_PNG : MediaType.parseMediaType("image/svg+xml"))
                .body("png".equals(format) ? image.png(stored.payload(), 1024) : image.svg(stored.payload()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal OAuth2User principal, @PathVariable UUID id) {
        if (!qrs.delete(ownerId(principal), id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> badInput() {
        return ResponseEntity.badRequest().body(Map.of("error", "invalid_request"));
    }

    private UUID ownerId(OAuth2User principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        long githubId = GithubIdentity.from(principal.getAttributes()).id();
        return accounts.findByGithubId(githubId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED)).id();
    }

    public record SaveQrRequest(String type, String title, String payload) {
    }
}
