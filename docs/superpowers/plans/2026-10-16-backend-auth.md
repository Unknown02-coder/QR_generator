# Backend Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 프론트엔드에 GitHub 로그인, 사용자 식별, 세션, CSRF, 로그아웃을 제공하는 Spring Boot 서버를 만든다.

**Architecture:** `backend/`를 독립 Gradle 프로젝트로 둔다. OAuth 사용자 정보 처리 중 DB에 사용자 정보를 먼저 저장하고, 성공한 경우에만 Spring Security가 로그인 세션을 수립한다. PostgreSQL의 `users` 테이블은 GitHub 숫자 ID를 내부 UUID에 연결하며 브라우저에는 내부 사용자 ID와 로그인 이름만 반환한다.

**Tech Stack:** Java 21, Spring Boot 4.1.1, Spring Security OAuth2 Client, Spring JDBC, PostgreSQL, Flyway, Gradle Wrapper, JUnit·MockMvc. 테스트 프로필은 H2 PostgreSQL 호환 모드를 사용하고, 가짜 OAuth HTTP 제공자로 실제 리다이렉트·코드 교환 경로를 시험한다. Docker가 있는 환경에서는 Testcontainers로 PostgreSQL SQL도 검증한다.

**Spec:** `docs/superpowers/specs/2026-10-15-backend-auth-design.md`

## Global Constraints

- API: `GET /api/me` → `{id,login}` 또는 401; `GET /api/csrf` → `{headerName,token}`; `POST /logout` → 204 또는 CSRF 오류 403.
- OAuth 시작 경로는 `/oauth2/authorization/github`, 콜백은 `/login/oauth2/code/github`.
- 개발 공개 서버 주소는 `http://127.0.0.1:8080`이며 OAuth 콜백 URL을 명시적으로 구성한다. 프론트엔드 개발 주소도 `127.0.0.1`을 사용한다.
- GitHub OAuth 상태 검증과 PKCE(S256)를 적용하고 `repo` 권한은 요청하지 않는다.
- GitHub 숫자 ID가 사용자 식별 기준이며 로그인 이름은 변경될 수 있다.
- GitHub 클라이언트 비밀값·토큰은 코드, Git, 응답, 브라우저 저장소에 넣지 않는다.
- 세션 인증과 CSRF 보호를 유지한다. 운영 쿠키는 HttpOnly·SameSite=Lax·Secure를 사용한다.
- 사용자 DB 저장에 실패하면 로그인 세션을 만들지 않는다. `/api/csrf`는 캐시하지 않는다.
- QR 저장·목록·다운로드·삭제는 이 계획의 범위가 아니다. 비로그인 입력·미리보기는 기존 브라우저 코드가 담당한다.
- 현재 작업 환경에는 Docker 엔진과 `psql`이 없다. H2 테스트는 PostgreSQL 통합 검사의 대체 증거가 아니므로 실제 DB 검사를 남은 제한으로 보고한다.

## File Map

| 파일 | 책임 |
| --- | --- |
| `backend/build.gradle`, `backend/settings.gradle`, `backend/gradlew*`, `backend/gradle/wrapper/*` | 고정된 의존성과 재현 가능한 빌드 |
| `backend/src/main/java/com/handmadeqr/HandmadeQrApplication.java` | 서버 시작 |
| `backend/src/main/resources/application.yml` | 환경 변수 기반 DB·OAuth·쿠키 설정 |
| `backend/src/main/resources/db/migration/V1__create_users.sql` | `users` 테이블과 고유 GitHub ID 제약 |
| `backend/src/main/java/com/handmadeqr/auth/UserAccount.java` | 내부 사용자 값 |
| `backend/src/main/java/com/handmadeqr/auth/UserAccountRepository.java` | 고유 GitHub ID로 동시 생성 수렴·조회·이름 갱신 |
| `backend/src/main/java/com/handmadeqr/auth/GithubIdentity.java` | OAuth 속성의 `id`, `login` 검증·변환 |
| `backend/src/main/java/com/handmadeqr/auth/GithubOAuth2UserService.java` | GitHub 사용자 정보 조회 후 DB 저장; 실패 시 인증 거부 |
| `backend/src/main/java/com/handmadeqr/auth/SecurityConfig.java` | URL 권한, OAuth2·PKCE, CSRF, 세션, 401·403, 로그아웃 |
| `backend/src/main/java/com/handmadeqr/auth/OAuthLoginHandler.java` | 저장 완료된 로그인만 완료 화면으로 이동, 실패 안내 |
| `backend/src/main/java/com/handmadeqr/auth/AuthController.java` | `/api/me`, `/api/csrf`, `/auth/complete`, `/auth/failed` |
| `backend/src/test/resources/application-test.yml` | 가짜 OAuth 자격 증명과 H2 테스트 DB |
| `backend/src/test/java/com/handmadeqr/auth/*Test.java` | 마이그레이션·사용자·보안·API 동작·가짜 제공자 OAuth 흐름·PostgreSQL 연결 검사 |
| `.gitignore`, `README.md` | 빌드 파일 제외 및 실행·OAuth 앱 설정 방법 |

## Review Focus

1. GitHub `id`가 정수형 종류를 바꾸거나 없을 때 잘못된 사용자와 연결하지 않고 로그인 실패로 처리한다. Task 2 테스트에 포함.
2. 같은 GitHub ID로 다시 로그인하거나 로그인 이름을 바꿔도 내부 UUID가 유지된다. Task 2 테스트에 포함.
3. 프론트엔드 포트에서 OAuth를 시작해도 서버 포트 콜백이 생성되고 `state`·S256 PKCE가 있으며 `repo` 범위를 요구하지 않는다. Task 3 테스트에 포함.
4. 브라우저가 `/api/csrf`에서 받은 실제 토큰을 헤더로 보내면 로그아웃되고, 빠지거나 다르면 403이다. Task 4 테스트에 포함.
5. 비로그인 `/api/**`는 HTML 로그인 페이지로 이동하지 않고 JSON 401을 반환한다. Task 3 테스트에 포함. 사용자 저장 실패 뒤 세션이 남지 않는 경우도 Task 3 테스트에 포함.

---

### Task 1: 서버 기초와 사용자 테이블

**Files:** `backend/build.gradle`, `backend/settings.gradle`, Gradle Wrapper, `HandmadeQrApplication.java`, `application.yml`, `V1__create_users.sql`, `application-test.yml`, `.gitignore`, `BackendStartupTest.java`.

**Interfaces:** `users(id UUID PRIMARY KEY, github_id BIGINT UNIQUE NOT NULL, login VARCHAR(255) NOT NULL, created_at TIMESTAMP WITH TIME ZONE NOT NULL, updated_at TIMESTAMP WITH TIME ZONE NOT NULL)`.

- [ ] Spring Boot 4.1.1·Java 21의 빈 Gradle 프로젝트와 Wrapper, 테스트 의존성만 준비한다. 아직 서버 설정과 사용자 테이블은 만들지 않는다.
- [ ] 실패하는 `BackendStartupTest`를 작성한다. 테스트 프로필에서 애플리케이션이 시작되고 Flyway가 `users` 테이블과 `github_id` 고유 제약을 만들었는지 확인한다.
- [ ] `cd backend; .\gradlew.bat test --tests '*BackendStartupTest'`로 실패를 확인한다.
- [ ] 서버 시작점, 환경 변수 설정, Flyway 마이그레이션을 만든다. 런타임 DB는 PostgreSQL, 테스트만 H2 PostgreSQL 호환 모드로 설정한다. 실제 비밀값은 설정 파일에 쓰지 않는다.
- [ ] 같은 명령으로 통과를 확인하고 `git add` 후 `git commit -m "build: bootstrap Spring Boot auth backend"`로 커밋한다.

### Task 2: GitHub 사용자 식별과 보존

**Files:** `UserAccount.java`, `UserAccountRepository.java`, `GithubIdentity.java`, `UserAccountRepositoryTest.java`, `GithubIdentityTest.java`.

**Interfaces:** `record UserAccount(UUID id, long githubId, String login)`, `record GithubIdentity(long id, String login)` with `static GithubIdentity from(Map<String,Object> attributes)`, `UserAccountRepository.upsert(GithubIdentity identity): UserAccount`, `UserAccountRepository.findByGithubId(long githubId): Optional<UserAccount>`.

- [ ] 실패하는 테스트를 작성한다. `id`의 정수 `Number` 수용, 누락·문자열·음수·범위 초과 거부, 빈 `login` 거부, 최초 생성·재로그인·이름 변경·다른 ID 분리를 검증한다.
- [ ] `cd backend; .\gradlew.bat test --tests '*GithubIdentityTest' --tests '*UserAccountRepositoryTest'`가 실패하는지 확인한다.
- [ ] GitHub 속성 파서와 JDBC 사용자 저장소를 만든다. 새 사용자는 UUID를 생성한다. 저장은 `INSERT ... ON CONFLICT DO NOTHING` 뒤 `UPDATE login ... WHERE github_id`와 `SELECT`로 구성해 기존 UUID를 유지한다. 고유 제약이 중복 생성을 막고, 마지막 조회에 행이 없으면 오류로 처리한다.
- [ ] 같은 명령이 통과하는지 확인하고 `git commit -m "feat: persist GitHub user identity"`로 커밋한다.

### Task 3: OAuth2 로그인과 API 보안 경계

**Files:** `SecurityConfig.java`, `GithubOAuth2UserService.java`, `OAuthLoginHandler.java`, `OAuthSecurityTest.java`, `GithubOAuth2UserServiceTest.java`.

**Interfaces:** `GithubOAuth2UserService.loadUser(OAuth2UserRequest): OAuth2User`는 기본 제공자로 사용자 정보를 받은 뒤 `GithubIdentity.from(attributes)`와 `UserAccountRepository.upsert`를 실행한다. 실패하면 `OAuth2AuthenticationException`을 던진다. 성공 핸들러는 `/auth/complete`, 실패 핸들러는 `/auth/failed`로 이동한다. `/api/csrf`와 OAuth 시작·콜백·완료·실패만 비로그인 허용한다.

- [ ] 실패하는 MockMvc 테스트를 작성한다. 프론트엔드 `Host: 127.0.0.1:5173`으로 시작한 OAuth 요청의 `redirect_uri`가 `http://127.0.0.1:8080/login/oauth2/code/github`인지, `state`, `code_challenge`, `code_challenge_method=S256`가 있고 `repo` scope가 없는지 검증한다. 비로그인 `/api/me`와 `/api/qrs`는 JSON 401이어야 한다. 사용자 DB 저장 실패 시 인증 완료 핸들러에 도달하지 않아야 한다.
- [ ] `cd backend; .\gradlew.bat test --tests '*OAuthSecurityTest' --tests '*GithubOAuth2UserServiceTest'`의 실패를 확인한다.
- [ ] 세션 기반 SecurityFilterChain과 `DefaultOAuth2AuthorizationRequestResolver`의 `withPkce()`를 적용한다. OAuth 콜백은 `APP_PUBLIC_BASE_URL`로 명시한다. 사용자 정보 서비스에서 DB 저장을 끝낸 후에만 인증을 완료한다. API 인증 실패·CSRF 실패는 JSON 401·403으로 반환한다.
- [ ] 같은 명령이 통과하는지 확인하고 `git commit -m "feat: add GitHub OAuth login security"`로 커밋한다.

### Task 4: 프론트엔드 인증 API와 로그아웃

**Files:** `AuthController.java`, `AuthApiTest.java`, `SecurityConfig.java`.

**Interfaces:** `GET /api/me` → `record CurrentUserResponse(UUID id, String login)`, `GET /api/csrf` → `record CsrfResponse(String headerName, String token)`, `POST /logout` → 204. `/auth/complete`와 `/auth/failed`는 별도 창용 최소 HTML이다.

- [ ] 실패하는 테스트를 작성한다. 인증된 `/api/me`의 필드, 비로그인 401, `/api/csrf`의 `Cache-Control: no-store`와 응답에서 받은 **실제** 토큰을 같은 세션의 헤더로 보내는 로그아웃 204, 누락·잘못된 CSRF 403, 로그아웃 뒤 `/api/me` 401을 검증한다. 성공·실패 HTML에는 비밀값이나 사용자 속성이 없어야 한다.
- [ ] `cd backend; .\gradlew.bat test --tests '*AuthApiTest'`의 실패를 확인한다.
- [ ] 프론트엔드 `src/api/client.ts` 응답 형태와 일치하는 컨트롤러·로그아웃 성공 핸들러·작은 완료 및 실패 화면을 만든다. `/api/me`의 사용자 UUID는 요청값이 아닌 인증된 GitHub ID로 조회한다. 완료 화면은 `window.close()`를 시도하고 닫히지 않으면 직접 닫도록 안내한다.
- [ ] 같은 명령이 통과하는지 확인하고 `git commit -m "feat: expose session auth API"`로 커밋한다.

### Task 5: OAuth 왕복 통합 검사

**Files:** `backend/src/test/java/com/handmadeqr/auth/OAuthFlowTest.java`, `backend/src/test/java/com/handmadeqr/auth/PostgresAuthIntegrationTest.java`, `backend/src/test/resources/application-test.yml`, `backend/build.gradle`.

**Interfaces:** 테스트용 로컬 HTTP 제공자가 GitHub의 authorize·token·user API를 흉내 낸다. 실제 비밀값·GitHub 계정·Docker는 쓰지 않는다.

- [ ] 실패하는 통합 테스트를 작성한다. 같은 브라우저 세션으로 OAuth 시작 → state를 포함한 콜백 → 로컬 제공자와 코드 및 PKCE `code_verifier` 교환 → 사용자 조회 → `/auth/complete` → `/api/me` 성공을 확인한다. 다른 GitHub ID는 다른 내부 UUID여야 하며, 잘못된 state 또는 사용자 저장 실패 뒤 `/api/me`는 401이어야 한다.
- [ ] `cd backend; .\gradlew.bat test --tests '*OAuthFlowTest'`의 실패를 확인한다.
- [ ] 테스트 프로필의 제공자 URL을 로컬 HTTP 제공자로 연결하고 세션·콜백·리다이렉트 설정을 보정한다. 제품 코드는 이 테스트를 위해 가짜 GitHub 주소를 하드코딩하지 않는다.
- [ ] Testcontainers의 `PostgresAuthIntegrationTest`를 작성해 실제 PostgreSQL에서 Flyway와 중복 GitHub ID 저장을 검증한다. Docker가 없으면 건너뛰되 테스트 보고서에 skipped를 남긴다.
- [ ] 같은 명령과 전체 `test`의 통과를 확인하고 `git commit -m "test: verify complete OAuth browser flow"`로 커밋한다.

### Task 6: 실행 문서와 기능 검증

**Files:** `README.md`.

**Interfaces:** 개발 환경 변수는 `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `APP_PUBLIC_BASE_URL`; OAuth 콜백 예시는 `http://127.0.0.1:8080/login/oauth2/code/github`.

- [ ] README에 GitHub OAuth 앱 생성·콜백 설정, PostgreSQL 준비, 환경 변수 설정, `127.0.0.1` 호스트 통일, `cd backend; .\gradlew.bat bootRun`과 테스트 명령을 적는다. 비밀값 예시는 가짜 값만 사용한다.
- [ ] `cd backend; .\gradlew.bat clean test`와 프로젝트 루트의 `npm test`, `npm run build`를 실행한다. 성공한 검사의 실제 결과를 기록한다.
- [ ] Docker 또는 PostgreSQL이 여전히 없다면 PostgreSQL Testcontainers 검사가 건너뛰어졌다고 명시한다. 가짜 제공자 왕복 테스트와 실제 GitHub 계정 로그인은 별도 결과로 구분해 보고한다. 실제 GitHub 앱 자격 증명이 준비된 환경에서는 브라우저 로그인, `/api/me`, CSRF 로그아웃을 확인한다.
- [ ] `git diff --check`와 `git status -sb`로 정리 상태를 확인하고 문서 변경을 커밋한다. 기능이 완료되면 `git push -u origin backend-auth`로 해당 브랜치를 푸시한다. `main` 병합은 별도 작업이다.
