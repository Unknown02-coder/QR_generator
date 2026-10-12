# QR Payload Foundation Implementation Plan

> **For agentic workers:** Use the repository instructions and implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert validated input into exact QR payload strings independently of the UI.

**Architecture:** Place one pure converter per input type under `src/qr/`. Return a discriminated result containing either the original payload or a field error. React forms and the later QR renderer consume these converters without duplicating validation.

**Tech Stack:** TypeScript; Node.js built-in test runner for this dependency-free first slice. React, Vite, and the QR renderer are introduced in later work.

**Spec:** `docs/설계안.md`

## Global Constraints

- Input types: URL, Wi-Fi, contact, plain text, email.
- Preserve payload values according to the spec; do not silently change Wi-Fi credentials.
- Invalid input must not leave an older QR available for saving.
- Figma determines visual layout. Wait for the newly exported final design before implementing screens.

## Review Focus

- Empty URL, missing HTTP(S) scheme, and malformed HTTP(S) URL must have distinct messages.
- Wi-Fi special characters and hexadecimal-looking values must survive encoding.
- Contact surname and given name must remain separate in vCard `N`.
- Empty or whitespace-only plain text must be rejected.
- Email subject and body must be URL encoded without sending a message.

## Task 1: URL payload

**Files:** Create `src/qr/urlPayload.ts`; create `tests/urlPayload.test.mjs`.

**Interface:** `createUrlPayload(value: string): { ok: true; payload: string } | { ok: false; code: 'required' | 'protocol' | 'invalid'; message: string }`.

- [x] Write tests for valid HTTP(S) URLs, empty input, missing/unsupported scheme, and malformed URL.
- [x] Run `node --experimental-strip-types --test tests/urlPayload.test.mjs` and confirm the tests fail because the converter is missing.
- [x] Implement the converter. Return the original valid input as the payload, without URL normalization.
- [x] Run the same command and confirm every case passes.

## Subsequent payload tasks

- [x] Wi-Fi: add a pure encoder with the spec's escaping, `WPA`/`nopass`, and hexadecimal-value rules; verify exact payloads in unit tests.
- [ ] Wi-Fi: decode a generated QR with a separate QR reader after the renderer is available.
- [ ] Contact: add vCard 3.0 generation with separate name parts, CRLF, escaping, and line folding; verify by parsing output.
- [ ] Plain text and email: add required-value validation and `mailto:` encoding; verify representative Unicode and special characters.
- [ ] QR renderer: choose a current browser QR library, render the five payloads with four-module quiet zones, and decode test outputs.

## Later implementation plans

- Frontend: scaffold React/TypeScript/Vite and implement the new final Figma export as interactive desktop screens.
- Backend: scaffold Spring Boot, OAuth2 login, PostgreSQL/Flyway, encrypted saved payloads, and owner-scoped APIs.
- Integration: save before download, PNG/SVG export from saved payloads, and confirmed `QR 삭제`.
