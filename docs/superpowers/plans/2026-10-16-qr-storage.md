# QR Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인 사용자가 QR을 암호화해 저장하고 자기 목록과 썸네일을 조회한다.

**Architecture:** `qr` 패키지에 입력 검증, 암호화, 저장소, 이미지 생성, API를 분리한다. 저장소 쿼리는 사용자 ID로 범위를 한정하고, 미리보기는 저장된 페이로드를 복호화해 재생성한다.

**Tech Stack:** Java 21, Spring Boot 4.1.1, JDBC, PostgreSQL/Flyway, Java AES-GCM, ZXing, JUnit/MockMvc/Testcontainers.

**Spec:** `docs/superpowers/specs/2026-10-16-qr-storage-design.md`

## Global Constraints

- 입력·미리보기는 비로그인으로 가능하지만 저장·목록은 GitHub 로그인과 세션이 필요하다.
- 저장에는 CSRF 토큰이 필요하다. 서버는 사용자별 소유권을 확인한다.
- 원문 페이로드는 암호화하고 목록·로그에 표시하지 않는다.
- 페이지는 1부터, 크기는 5건 고정이다. 다섯 유형과 프론트엔드 응답 필드명을 그대로 사용한다.
- PNG·SVG 다운로드와 삭제는 이 계획의 범위 밖이다.

## File Map

| 파일 | 책임 |
| --- | --- |
| `backend/src/main/resources/db/migration/V2__create_saved_qrs.sql` | QR 테이블·FK·목록 인덱스 |
| `backend/src/main/java/com/handmadeqr/qr/QrPayloadCipher.java` | AES-GCM 암복호화·키 검증 |
| `backend/src/main/java/com/handmadeqr/qr/QrInput.java` | 유형·제목·페이로드 확인, 안전한 summary |
| `backend/src/main/java/com/handmadeqr/qr/QrImage.java` | QR 용량 확인 및 PNG 생성 |
| `backend/src/main/java/com/handmadeqr/qr/SavedQrRepository.java` | 소유자 한정 저장·목록·단건 조회 |
| `backend/src/main/java/com/handmadeqr/qr/QrController.java` | 저장·목록·미리보기 API와 오류 응답 |
| `backend/src/test/java/com/handmadeqr/qr/*Test.java` | 암호화·검증·DB·HTTP 검증 |
| `backend/build.gradle`, `application.yml`, `application-test.yml`, `README.md` | QR 의존성·키 설정·실행 안내 |

## Review Focus

1. 동일한 암호문을 다른 소유자 또는 QR ID 행에 옮기면 복호화가 실패한다. Task 1에서 검사.
2. 긴 페이로드가 QR 용량을 넘으면 DB 저장 전에 400이 된다. Task 2에서 검사.
3. 다른 사용자는 직접 ID를 알아도 미리보기 404를 받는다. Task 4에서 검사.
4. 같은 생성 시각의 목록 순서가 안정적이다. Task 3에서 검사.
5. 잘못된 페이지·유형·제목과 CSRF 누락은 각각 400·403이다. Task 4에서 검사.

---

### Task 1: 암호화와 테이블

**Files:** `V2__create_saved_qrs.sql`, `QrPayloadCipher.java`, `QrPayloadCipherTest.java`, 설정 파일.

**Interfaces:** `encrypt(UUID ownerId, UUID qrId, String payload): byte[]`, `decrypt(UUID ownerId, UUID qrId, byte[] stored): String`. Base64 32바이트 키, 저장 형식 버전 1 + nonce 12바이트 + GCM 암호문.

- [ ] 암복호화 왕복·nonce 재사용 방지·소유자/QR ID 불일치 실패·잘못된 키 검사를 먼저 작성한다.
- [ ] 지정 테스트를 실행해 누락된 동작으로 실패하는지 확인한다.
- [ ] V2 마이그레이션과 암호화 클래스를 최소 구현한다.
- [ ] 지정 테스트와 전체 백엔드 테스트를 통과시킨 뒤 커밋한다.

### Task 2: 입력·QR 이미지 검증

**Files:** `QrInput.java`, `QrImage.java`, 각 테스트, `build.gradle`.

**Interfaces:** `QrInput.validated(String type, String title, String payload)`는 정규화된 제목·유형·고정 summary를 반환한다. `QrImage.validate(String payload)`와 `png(String payload, int size)`는 UTF-8/M/4모듈 설정을 공유한다.

- [ ] 다섯 유형, 누락·모순된 형식, QR 용량 초과, PNG 재읽기 검사를 먼저 작성한다.
- [ ] 지정 테스트의 실패를 확인한다.
- [ ] ZXing 의존성과 입력·이미지 클래스를 구현한다.
- [ ] 지정 테스트와 전체 백엔드 테스트를 통과시킨 뒤 커밋한다.

### Task 3: 소유자 한정 저장·목록

**Files:** `SavedQrRepository.java`, `SavedQrRepositoryTest.java`.

**Interfaces:** `save(UUID ownerId, QrInput input): SavedQr`, `page(UUID ownerId, int page, String type): QrPage`, `findPayload(UUID ownerId, UUID qrId): Optional<String>`.

- [ ] 자기 목록·다른 계정 분리·5건 페이지·유형 필터·동률 정렬·DB 암호문 검사를 먼저 작성한다.
- [ ] 지정 테스트의 실패를 확인한다.
- [ ] 소유자 조건이 포함된 SQL과 DTO를 구현한다.
- [ ] 지정 테스트와 전체 백엔드 테스트를 통과시킨 뒤 커밋한다.

### Task 4: HTTP 계약과 문서

**Files:** `QrController.java`, `QrControllerTest.java`, `PostgresQrIntegrationTest.java`, `README.md`.

**Interfaces:** `POST /api/qrs` 201, `GET /api/qrs` 200, `GET /api/qrs/{id}/preview` image/png. 인증 사용자는 기존 `GithubIdentity`와 `UserAccountRepository`로 조회한다.

- [ ] 저장→목록→PNG 재읽기, 비로그인 401, CSRF 403, 유효성 400, 타인 ID 404 검사를 먼저 작성한다.
- [ ] 지정 테스트의 실패를 확인한다.
- [ ] 컨트롤러·오류 응답·PostgreSQL 통합 검사를 만들고 README에 키 설정과 구현 범위를 갱신한다.
- [ ] `cd backend; .\gradlew.bat clean test`, 루트 `npm test`, `npm run build`, `git diff --check`를 실행한다. PostgreSQL 검사가 건너뛰면 기록한다.
- [ ] 변경을 커밋하고 `backend-qr-storage`를 GitHub에 푸시한다.
