# QR 만들기

확정된 데스크톱 시안을 기준으로 한 QR 생성 웹앱입니다. URL, Wi-Fi, 연락처, 텍스트, 이메일 입력과 QR 미리보기를 로그인 없이 사용할 수 있습니다. Spring Boot 서버에는 GitHub 로그인, 사용자 식별, 세션, CSRF, 로그아웃과 QR 저장·목록·썸네일 조회·재다운로드·삭제가 구현돼 있습니다.

## 로컬 실행

Node.js 20.19 이상, Java 21, PostgreSQL을 준비합니다. PostgreSQL에 `handmadeqr` 데이터베이스와 접속 계정을 만듭니다. 서버를 시작하면 Flyway가 사용자 테이블을 생성합니다.

GitHub에서 OAuth App을 만들고 **Authorization callback URL**을 `http://127.0.0.1:8080/login/oauth2/code/github`로 설정합니다. 앱의 Client ID와 Client Secret은 서버 환경 변수로만 전달합니다. 저장소 파일이나 브라우저 환경 변수(`VITE_`로 시작하는 값)에 비밀값을 넣지 마세요.

| 서버 환경 변수 | 값 |
| --- | --- |
| `GITHUB_CLIENT_ID` | GitHub OAuth App의 Client ID (필수) |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App의 Client Secret (필수) |
| `DB_URL` | JDBC 연결 주소. 기본값: `jdbc:postgresql://127.0.0.1:5432/handmadeqr` |
| `DB_USERNAME` | PostgreSQL 계정. 기본값: `handmadeqr` |
| `DB_PASSWORD` | PostgreSQL 비밀번호 |
| `APP_PUBLIC_BASE_URL` | OAuth 콜백의 서버 주소. 로컬 기본값: `http://127.0.0.1:8080` |
| `SESSION_COOKIE_SECURE` | 로컬 HTTP에서는 `false`(기본값), 운영 HTTPS에서는 `true` |
| `QR_ENCRYPTION_KEY` | Base64로 인코딩한 32바이트 키 (필수). QR 저장 데이터를 읽으려면 재시작 후에도 같은 키를 사용해야 함 |

`QR_ENCRYPTION_KEY`는 한 번 생성해 서버의 비밀 환경 변수에 보관합니다. 예를 들어 PowerShell에서 `[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))`로 값을 만들 수 있습니다. 키를 Git이나 프론트엔드 설정에 넣지 마세요.

환경 변수를 설정한 터미널에서 서버를 실행합니다.

```powershell
cd backend
.\gradlew.bat bootRun
```

다른 터미널에서 웹 화면을 실행합니다.

```sh
npm install
npm run dev
```

웹 주소는 `http://127.0.0.1:5173/`입니다. 웹과 서버에 모두 `127.0.0.1`을 사용하세요. 비로그인 상태에서는 로그인·비로그인 사용 선택 화면이 홈으로 열립니다. `HandmadeQR`를 누르면 홈으로 돌아가고, `QR 만들기` 또는 `비로그인으로 사용하기`로 입력 화면에 들어갑니다. Vite는 `/api`, `/oauth2`, `/logout`을 `http://127.0.0.1:8080`으로 전달합니다. 다른 서버 주소를 쓰면 `.env.example`을 참고해 `VITE_API_BASE_URL`을 설정하세요.

## 검사

서버 검사:

```powershell
cd backend
.\gradlew.bat clean test
```

PostgreSQL 통합 검사는 Docker가 실행 중일 때 Testcontainers로 수행합니다. Docker가 없으면 해당 검사만 건너뜁니다.

웹 화면 검사(프로젝트 루트):

```sh
npm test
npm run build
```

개발 서버에서 `/?preview=dashboard`를 열면 23건의 예시 데이터로 `내 QR` 목록·필터·페이지네이션·삭제 확인 창을 살펴볼 수 있습니다. 예시 데이터는 브라우저 메모리에만 있고 실제 저장이나 다운로드에 사용되지 않습니다. 배포 빌드에는 이 미리보기 경로가 작동하지 않습니다.

## 서버 연결 규약

인증과 QR 저장·목록·썸네일·다운로드·삭제 API가 구현돼 있습니다.

| 요청 | 응답 또는 역할 | 상태 |
| --- | --- | --- |
| `GET /api/me` | 로그인 시 `{ "id": "...", "login": "..." }`, 비로그인 시 401 | 구현 |
| `GET /api/csrf` | `{ "headerName": "X-CSRF-TOKEN", "token": "..." }` | 구현 |
| `GET /oauth2/authorization/github` | GitHub 로그인 시작 | 구현 |
| `POST /logout` | 세션 종료 | 구현 |
| `GET /api/qrs?page=1&size=5&type=url` | `{ "items": [...], "total": 23, "page": 1, "pageSize": 5 }`; `type`은 선택값 | 구현 |
| `POST /api/qrs` | `{ type, title, payload }`를 계정에 암호화해 저장하고 QR 메타데이터 반환 | 구현 |
| `GET /api/qrs/{id}/preview` | 해당 사용자의 QR 미리보기 PNG | 구현 |
| `GET /api/qrs/{id}/download?format=png` | 저장된 페이로드에서 1024×1024 PNG 또는 SVG 재생성 (`format=svg`); 유형별 파일명으로 첨부 | 구현 |
| `DELETE /api/qrs/{id}` | 소유권 확인 후 QR 삭제; 성공 시 204 | 구현 |

인증된 호출은 세션 쿠키를 사용합니다. 변경 요청은 `/api/csrf`에서 받은 헤더를 보냅니다. 목록 응답의 `summary`는 유형별 고정 문구이며 Wi-Fi 비밀번호와 연락처 상세 내용을 포함하지 않습니다. 서버는 저장 페이로드를 암호화하고 소유권을 검사합니다.

페이지 번호는 1부터 시작합니다. 서버는 최신 저장순으로 5건씩 반환합니다. PNG는 1024×1024픽셀, SVG는 벡터이며 둘 다 4모듈의 흰 여백을 포함합니다. 다운로드와 삭제는 소유자에게만 허용되며, 존재하지 않거나 다른 계정의 QR은 404를 반환합니다.

화면 기준 파일은 [`output/QR_생성_전체_화면시안_Figma_붙여넣기.svg`](output/QR_생성_전체_화면시안_Figma_붙여넣기.svg)입니다. SVG에는 비로그인 홈과 `내 QR` 로그인 안내, 저장 후 다운로드 흐름이 반영돼 있습니다. 실제 동작 기준은 [`docs/설계안.md`](docs/설계안.md)를 따릅니다.
