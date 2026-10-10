# URL QR Core Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The user requested immediate execution of the smallest first feature in this chat; no additional implementation authorization is needed.

**Goal:** Validate web addresses and generate a scannable QR matrix/SVG independently of the future React screens.

**Architecture:** A pure URL validator preserves the original payload. A separate QR generator uses the qrcode library's matrix and renders black modules over an opaque white background, with four blank modules on all sides. No authentication, persistence, or download UI is part of this first slice.

**Tech Stack:** TypeScript, qrcode, Node test runner. sharp rasterizes the real SVG in tests; jsQR independently decodes it.

**Spec:** `docs/설계안.md`, `AGENTS.md`, and the user's confirmed flow on 2026-10-10.

## Global Constraints

- 데스크톱 우선, 모바일 화면은 이번 범위에서 제외.
- URL·Wi-Fi·연락처·텍스트·이메일의 페이로드 변환을 화면 코드와 분리한다.
- 로그인 없이 QR 입력·미리보기·PNG/SVG 다운로드를 사용할 수 있다 (2026-10-10 사용자 설계 변경 반영; 다운로드 UI는 이 첫 모듈 단계의 범위 밖이다).
- 계정 보관과 `내 QR` 재다운로드에는 GitHub 로그인과 명시적인 QR 저장이 필요하다. 비로그인 직접 다운로드는 계정에 보관하지 않는다.
- QR은 검정색 코드와 흰색 배경으로 만들고, 모든 방향에 최소 4모듈의 흰 여백을 포함한다.
- 의존성 버전을 빌드 파일과 lockfile에 고정한다.

## Review Focus

- URL query/fragment/case/Unicode must survive encoding without URL normalization.
- URL parsers accept shorthand such as `https:example.com`; these must fail the explicit `http://`/`https://` requirement.
- Leading/trailing whitespace and control characters must not be silently discarded by the URL parser.
- QR payloads resembling markup must never become executable SVG markup.
- Empty and over-capacity inputs must return failures without leaking an earlier successful QR.

## Task 1: URL payload validation

**Files:** `frontend/package.json`, `frontend/tsconfig*.json`, `frontend/tests/url.test.ts`, `frontend/src/qr/url.ts`.

**Interfaces:** Produces `validateUrl(input: string): UrlValidation`, a discriminated success `{ok: true, payload: string}` or failure `{ok: false, code: 'required' | 'protocol' | 'invalid', message: string}`.

- [x] Write cases for HTTP/HTTPS, preserved query/fragment/Unicode, empty input, missing/other/shorthand protocols, malformed hosts/ports, whitespace and control characters.
- [x] Run `npm test` from frontend and record the expected missing-implementation failure.
- [x] Implement validator with explicit protocol/whitespace checks and URL syntax parsing; never serialize the parsed URL as the payload.
- [x] Run the suite and typecheck; record the result.

## Task 2: Scannable QR matrix and SVG

**Files:** `frontend/tests/generate.test.ts`, `frontend/src/qr/generate.ts`.

**Interfaces:** Produces `generateQr(payload: string): QrResult` with matrix `size`/`data`, `svg`, and `quietZone: 4` on success; `empty`/`capacity`/`generation` errors on failure. Consumes successful URL validation as the caller-provided payload; generator is reusable for the other types.

- [x] Write SVG rasterization + independent decode cases for ordinary, Unicode, and markup-like payloads; check opacity, black/white pixels, and all four quiet-zone boundaries. Add empty/oversize failures and success→failure→success isolation.
- [x] Run tests and record the expected missing-implementation failure.
- [x] Use qrcode.create with error correction M; copy the matrix and render numeric module coordinates into SVG, keeping payload text out of SVG markup.
- [x] Run `npm test`, `npm run typecheck`, `npm run build`; all must exit zero. Record actual counts and remaining work in docs/구현현황.md.

## Execution notes

- Work is on `codex/url-qr-core` in the clean existing checkout. No new worktree is necessary for this local first slice.
- Do not push, merge, publish, or claim web UI/authentication/download completion.
- Follow-up on 2026-10-10: the user delegated missing UI decisions. The `시안 보완 확정 UI` section of docs/설계안.md now fixes password visibility and capacity/generation/save/download failure copy and recovery behavior. These UI additions remain unimplemented.

## Completion evidence

- Final `npm test`: 39 passed, 0 failed/skipped (26 URL validation, 13 QR generation).
- Final `npm run typecheck` and `npm run build`: exit 0.
- Independent read-only reviewer: no Critical/Important findings. One malformed UTF-16 validation issue was reproduced with two failing tests and fixed; valid emoji round-trip coverage was also added.
- UI, authentication, persistence, downloads, and physical camera checks remain future stages as recorded in docs/구현현황.md.
