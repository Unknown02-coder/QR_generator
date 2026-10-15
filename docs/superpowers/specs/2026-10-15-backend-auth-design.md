# 백엔드 인증 기능 설계

작성일: 2026-10-15
브랜치: `backend-auth`

## 목적과 범위

기존 React 화면이 GitHub 로그인 상태를 확인하고, 이후 QR 저장 API에 사용할 세션과 CSRF 토큰을 받을 수 있게 한다. 이 브랜치에서 Java 21·Spring Boot·Gradle 기반 서버를 `backend/`에 만들고 PostgreSQL·Flyway로 사용자 식별 정보를 관리한다. QR 저장·목록·다운로드·삭제 API는 각각 후속 기능 브랜치에서 구현한다.

완료 시 프론트엔드의 `GET /api/me`, `GET /api/csrf`, `GET /oauth2/authorization/github`, `POST /logout` 호출이 서버와 연결된다. 비로그인 QR 입력과 미리보기는 계속 브라우저에서 동작한다.

## 구조와 책임

- `backend/`: 독립 실행 가능한 Gradle 기반 Spring Boot 애플리케이션과 Gradle Wrapper.
- 인증 설정: GitHub OAuth2 Login, 상태 검증과 PKCE, 서버 세션, CSRF 보호, API의 401·403 응답을 담당한다.
- 사용자 저장소: GitHub의 변경되지 않는 숫자 계정 ID를 기준으로 내부 사용자 UUID를 만들거나 조회한다. GitHub 로그인 이름은 표시용으로 갱신한다. Flyway가 `users` 테이블을 생성한다.
- 인증 API: 현재 사용자와 CSRF 토큰을 프론트엔드 호출 규격 그대로 반환한다.
- 로그인 완료 화면: 별도 인증 창에서 로그인 성공 후 창을 닫는다. 원래 탭은 기존 코드처럼 `/api/me`를 다시 조회한다.

QR 데이터 저장소와 사용자 저장소는 별개다. GitHub 저장소 접근 권한은 요청하지 않으며 OAuth 클라이언트 비밀값과 토큰을 응답·로그·프론트엔드 저장소에 노출하지 않는다.

## 요청과 응답

| 요청 | 인증 | 결과 |
| --- | --- | --- |
| `GET /oauth2/authorization/github` | 불필요 | GitHub 로그인 시작. OAuth 상태값과 PKCE 검증값은 서버 세션에 유지. |
| `GET /login/oauth2/code/github` | OAuth 콜백 | 인증 성공 시 사용자 생성·갱신, 세션 수립 후 작은 완료 화면으로 이동. |
| `GET /api/me` | 필요 | `{ "id": "내부 사용자 UUID", "login": "GitHub 로그인 이름" }`. 비로그인 시 JSON 401. |
| `GET /api/csrf` | 불필요 | `{ "headerName": "X-CSRF-TOKEN", "token": "..." }`. 응답 조회가 세션의 CSRF 토큰을 준비. |
| `POST /logout` | 필요, CSRF | 세션과 인증 정보를 폐기하고 204 반환. CSRF 누락·불일치 시 JSON 403. |

미구현 QR API에 인증되지 않은 사용자가 접근하면 로그인 페이지 HTML 대신 JSON 401을 반환한다. 기능이 구현되기 전의 경로를 성공 응답처럼 보이게 만들지 않는다. 서버가 반환하는 JSON은 `data` 래퍼 없이 기존 프론트엔드 타입과 일치한다.

## 데이터와 비밀값

`users`는 내부 UUID 기본키, 고유한 GitHub 숫자 ID, 현재 GitHub 로그인 이름, 생성·수정 시각을 보관한다. 같은 GitHub ID로 다시 로그인하면 같은 내부 UUID를 돌려준다. 이름이 바뀌면 표시용 로그인 이름만 갱신한다. 사용자 식별을 로그인 이름이나 이메일에 의존하지 않는다.

GitHub 클라이언트 ID·비밀값, PostgreSQL 접속 정보는 환경 변수로 주입한다. 비밀값을 저장소의 설정 파일에 넣지 않는다. 세션 쿠키는 HttpOnly와 SameSite=Lax를 사용하고 운영 환경에서는 Secure를 사용한다. 개발 중에는 Vite가 `/api`, `/oauth2`, `/logout`을 같은 호스트의 서버로 프록시한다.

## 오류와 복구

GitHub 인증 취소·실패 시 기존 입력 탭은 유지한다. 별도 인증 창에 재시도할 수 있는 안내를 표시한다. 데이터베이스 사용 불가 시 로그인 완료로 오인시키지 않고 오류를 반환한다. CSRF 실패는 403, 인증되지 않은 보호 API는 401로 구분한다. 오류 로그에 OAuth 토큰·비밀값·전체 사용자 정보가 포함되지 않게 한다.

## 검증과 완료 기준

1. 인증이 없으면 `/api/me`는 401이고 `/api/csrf`는 유효한 토큰과 헤더 이름을 반환한다.
2. 모의 GitHub OAuth 인증에서 사용자 생성·재로그인·로그인 이름 변경 후에도 내부 사용자 ID가 유지된다.
3. 인증된 `/api/me`는 프론트엔드가 기대하는 두 필드만 반환한다.
4. CSRF 없는 `POST /logout`은 403이고, 유효한 토큰을 보낸 요청은 204와 세션 종료를 확인한다.
5. OAuth 요청에 상태 검증과 PKCE가 적용되며 GitHub 저장소 권한을 요청하지 않는다.
6. Flyway 마이그레이션과 서버 시작 검사를 실행한다. 실제 GitHub 계정 로그인은 사용자 측 OAuth 앱 자격 증명과 콜백 URL을 설정한 환경에서 별도로 확인한다.

## 후속 브랜치와 연결

QR 기능은 이 브랜치의 내부 사용자 UUID와 세션 인증을 사용한다. 권장 순서는 `backend-qr-storage`(암호화·저장·목록), `backend-qr-download`(미리보기·PNG·SVG 재생성), `backend-qr-delete`(소유권 확인·삭제)다. 각 브랜치는 앞 기능이 통합된 기준에서 시작하고, 기능별 검사를 통과한 뒤 해당 브랜치를 GitHub에 푸시한다.
