# QR 만들기

확정된 데스크톱 시안을 기준으로 한 QR 생성 웹 프론트엔드입니다. URL, Wi-Fi, 연락처, 텍스트, 이메일 입력과 QR 미리보기를 로그인 없이 사용할 수 있습니다.

## 실행

JavaScript 런타임은 Node.js 20.19 이상을 사용합니다.

```sh
npm install
npm run dev
```

기본 주소는 `http://127.0.0.1:5173/`입니다. 비로그인 상태에서는 로그인·비로그인 사용 선택 화면이 홈으로 열립니다. `HandmadeQR`를 누르면 홈으로 돌아가고, `QR 만들기` 또는 `비로그인으로 사용하기`로 입력 화면에 들어갑니다. Vite는 `/api`, `/oauth2`, `/logout`을 `http://127.0.0.1:8080`으로 전달합니다. 다른 서버 주소를 쓰면 `.env.example`을 참고해 `VITE_API_BASE_URL`을 설정하세요.

```sh
npm test
npm run build
```

개발 서버에서 `/?preview=dashboard`를 열면 23건의 예시 데이터로 `내 QR` 목록·필터·페이지네이션·삭제 확인 창을 살펴볼 수 있습니다. 예시 데이터는 브라우저 메모리에만 있고 실제 저장이나 다운로드에 사용되지 않습니다. 배포 빌드에는 이 미리보기 경로가 작동하지 않습니다.

## 서버 연결 규약

현재 저장소에는 Spring Boot 서버가 없습니다. 따라서 로그인, 저장, 재다운로드, 사용자별 접근 제어는 서버가 연결될 때까지 완료되지 않습니다. 프론트엔드의 호출 계약은 다음과 같습니다.

| 요청 | 응답 또는 역할 |
| --- | --- |
| `GET /api/me` | 로그인 시 `{ "id": "...", "login": "..." }`, 비로그인 시 401 |
| `GET /api/csrf` | `{ "headerName": "X-CSRF-TOKEN", "token": "..." }` |
| `GET /api/qrs?page=1&size=5&type=url` | `{ "items": [...], "total": 23, "page": 1, "pageSize": 5 }`; `type`은 선택값 |
| `POST /api/qrs` | `{ type, title, payload }`를 계정에 저장하고 저장한 QR 메타데이터 반환 |
| `GET /api/qrs/{id}/preview` | 해당 사용자의 QR 미리보기 이미지 |
| `GET /api/qrs/{id}/download?format=png` | 저장된 페이로드에서 PNG 또는 SVG 재생성 |
| `DELETE /api/qrs/{id}` | 소유권 확인 후 QR 삭제 |
| `GET /oauth2/authorization/github` | GitHub 로그인 시작 |
| `POST /logout` | 세션 종료 |

모든 호출은 세션 쿠키를 사용합니다. 변경 요청은 `/api/csrf`에서 받은 헤더를 보냅니다. 목록 응답의 `summary`에는 Wi-Fi 비밀번호와 연락처 상세 내용을 넣지 않아야 하며, 서버는 저장 페이로드 암호화와 소유권 검사를 담당해야 합니다.

페이지 번호는 1부터 시작합니다. 서버는 최신 저장순으로 5건씩 반환해야 합니다. PNG는 1024×1024픽셀, SVG는 벡터여야 하고 둘 다 4모듈 이상의 흰 여백이 필요합니다.

화면 기준 파일은 [`output/QR_생성_전체_화면시안_Figma_붙여넣기.svg`](output/QR_생성_전체_화면시안_Figma_붙여넣기.svg)입니다. SVG에는 비로그인 홈과 `내 QR` 로그인 안내, 저장 후 다운로드 흐름이 반영돼 있습니다. 실제 동작 기준은 [`docs/설계안.md`](docs/설계안.md)를 따릅니다.
