# API 명세서

동기화일: 2026-10-10 · 서버 구현 전 초안

원본: [노션 API 명세서](https://app.notion.com/p/3f5623549d18800d8c2fdf7157c0b7e3)

이 파일은 노션의 공통 규칙과 10개 API 상세 명세를 저장소에서 확인할 수 있도록 옮긴 사본이다. API 계약을 변경하면 이 파일과 노션을 함께 갱신한다. 기능·보안 기준은 [설계안](설계안.md)과 [AGENTS.md](../AGENTS.md)이며, 서버 구현 완료 여부는 [구현 현황](구현현황.md)에서 확인한다.

## API 목록

| 기능군 | Phase | 기능 | HTTP | 경로 | 우선순위 | 서버 구현 |
| --- | --- | --- | --- | --- | --- | --- |
| 인증 | P01 | GitHub 로그인 시작 | GET | `/oauth2/authorization/github` | P0 | 시작 전 |
| 인증 | P01 | GitHub 로그인 콜백 | GET | `/login/oauth2/code/github` | P0 | 시작 전 |
| 인증 | P01 | 내 로그인 정보 조회 | GET | `/api/auth/me` | P0 | 시작 전 |
| 인증 | P01 | CSRF 토큰 조회 | GET | `/api/auth/csrf` | P0 | 시작 전 |
| 인증 | P01 | 로그아웃 | POST | `/api/auth/logout` | P0 | 시작 전 |
| 내 QR | P02 | QR 계정 저장 | POST | `/api/qrs` | P0 | 시작 전 |
| 내 QR | P02 | 내 QR 목록 조회 | GET | `/api/qrs` | P0 | 시작 전 |
| 내 QR | P02 | QR 삭제 | DELETE | `/api/qrs/{qrId}` | P0 | 시작 전 |
| 파일 | P03 | 저장 QR 미리보기 | GET | `/api/qrs/{qrId}/preview` | P1 | 시작 전 |
| 파일 | P03 | 저장 QR 다운로드 | GET | `/api/qrs/{qrId}/download` | P0 | 시작 전 |

작성일: 2026-10-10 · 문서 상태: **v1 초안 / 서버 구현 전**
> 비로그인은 QR 생성·미리보기·PNG/SVG 다운로드를 브라우저에서 처리합니다. 계정에 보관하지 않으며 QR은 여러 번 스캔할 수 있습니다. 서버 API는 GitHub 로그인과 내 QR 보관 기능에 사용합니다.
**기능을 누르면 요청·응답·오류·처리 규칙·검사 기준을 볼 수 있습니다.** 진행상황은 실제 서버 구현 상태이며 현재 모두 시작 전입니다.
### 기능군과 Phase
| Phase | 기능군 | 포함 API | 완료 기준 |
| --- | --- | --- | --- |
| P01 | 인증 · 5개 | GitHub 로그인 시작·콜백, 내 로그인 정보, CSRF, 로그아웃 | 실제 GitHub 로그인·취소·실패, 세션·CSRF 확인, 입력 유지 |
| P02 | 내 QR · 3개 | QR 계정 저장, 내 QR 목록, QR 삭제 | 암호화 저장, 중복 저장 방지, 계정 격리, 삭제 확인 |
| P03 | 파일 · 2개 | 저장 QR 미리보기, PNG·SVG 다운로드 | 저장된 페이로드 재생성, 파일 디코딩, 소유권·삭제 후 차단 |
Phase는 **백엔드 API 구현 순서**를 구분한 제안입니다. 우선순위 P0·P1과는 별개입니다. 데스크톱 퍼블리싱과 비로그인 생성·다운로드는 이 API 단계에 앞서 진행할 수 있습니다.
기본 보기는 기능군으로, 두 번째 보기는 Phase로 묶었습니다. 각 행은 요청·응답·오류·검사 기준을 담은 상세 페이지입니다.
아래 상세 명세와 API 목록을 참고한다.
### 이메일 페이로드 호환성

- EMAIL 받는 주소와 CONTACT 이메일은 초기 구현에서 ASCII 로컬 부분과 DNS 도메인을 지원합니다. 점은 로컬 부분의 처음·끝 또는 연속 위치에 사용할 수 없습니다. 인용된 로컬 부분, IP 주소 도메인, 국제화 로컬 부분과 여러 수신자는 이번 범위에서 제외합니다. 국제화 도메인은 punycode 표기를 사용합니다.
- EMAIL 본문의 CR·LF·CRLF 줄바꿈은 CRLF로 통일한 뒤 URL 인코딩합니다. 제목에는 줄바꿈을 허용하지 않습니다. 근거: [RFC 6068 §5](https://www.rfc-editor.org/rfc/rfc6068#section-5).
- 서버 저장 검증·재생성에서도 같은 규칙을 적용해야 합니다. 이는 생성 기능의 브라우저 구현 기준이며 서버 API 구현 완료를 뜻하지 않습니다.

## 공통 규칙
### 문서 기준과 범위
- 기능 기준: [저장소 설계안](https://github.com/Unknown02-coder/QR_generator/blob/codex/url-qr-core/docs/%EC%84%A4%EA%B3%84%EC%95%88.md), [AGENTS.md](https://github.com/Unknown02-coder/QR_generator/blob/codex/url-qr-core/AGENTS.md), 로컬 SVG 수정본.
- 기존 확정 사항은 비로그인 직접 다운로드, GitHub 로그인 후 계정 보관, 내 QR 재다운로드와 QR 삭제 확인입니다.
- API 경로, JSON 필드, 상태 코드, 제목 100자 제한, 요청 64 KiB 제한, 커서 페이지 방식은 **이 문서에서 제안한 초기 계약**입니다. 서버 구현·배포·실제 API 검사를 완료했다는 뜻이 아닙니다.
- 서버 구성은 Java 21·Spring Boot·Spring Security OAuth2 Login·PostgreSQL·Flyway입니다. 의존성 버전은 추후 빌드 파일에 고정합니다.
- P0: 계정 로그인·보관·목록·다운로드·삭제에 필수. P1: 내 QR 썸네일 표시. P2: 이번 명세에 추가하지 않은 후속 기능.
### 서버 API와 브라우저 처리
| 기능 | 처리 위치 | 규칙 |
| --- | --- | --- |
| 비로그인으로 사용하기 | 프론트엔드 화면 이동 | 기존 입력 유지. 로그인 없이 생성 화면 진입 |
| URL·Wi-Fi·연락처·텍스트·이메일 QR 생성과 미리보기 | 브라우저 | 유형별 페이로드 변환·검증 및 공통 QR 생성기 |
| 비로그인 PNG·SVG 다운로드 | 브라우저 | 현재 유효한 QR을 내보냄. 인증·저장·목록 API 호출 없음 |
| GitHub 로그인 | 서버 OAuth2 | 별도 창, 원래 탭의 입력 유지 |
| QR 계정 저장·내 QR·재다운로드·QR 삭제 | 서버 API | 세션 인증, 소유권, 변경 요청 CSRF |
| 비밀번호 보기·가리기 및 공개 네트워크 전환 | 프론트엔드 | 별도 API 없음. 입력과 페이로드를 보기 동작으로 변경하지 않음 |
비로그인 입력·페이로드는 서버 또는 localStorage·sessionStorage·IndexedDB에 보관하지 않습니다. 새로고침·탭 종료 시 미저장 입력은 사라지지만 다운로드한 파일은 그대로 사용할 수 있습니다. 1회 스캔 후 만료 API, 자체 회원가입 API, JWT 로그인·토큰 재발급 API는 제공하지 않습니다.
### 경로와 기본 응답
- JSON API 경로는 `/api`로 시작합니다. GitHub 인증 시작·콜백은 Spring Security 경로를 사용합니다.
- 운영 배포는 프론트엔드와 API가 같은 출처라는 초안 기준입니다. 개발 환경은 Vite 프록시를 사용하고 실제 호스트·포트는 실행 설정으로 관리합니다.
- 요청·JSON 응답은 UTF-8. JSON 응답 Content-Type은 application/json.
- 날짜는 UTC ISO 8601 문자열. 화면에서는 사용자 시간대에 맞춰 표시합니다.
- 내부 리소스 ID는 UUID 문자열. 페이지 cursor는 불투명 값.
- 성공 JSON은 `{"data": ...}`. 204는 본문 없음. 인증 리다이렉트와 SVG/PNG 파일은 JSON 성공 형식을 사용하지 않습니다.
- 세션·CSRF·내 QR·파일 응답은 Cache-Control: no-store. 이미지·파일은 X-Content-Type-Options: nosniff.
### 인증과 CSRF
- 서버 세션 인증을 사용합니다. 운영 세션 쿠키는 JSESSIONID, HttpOnly, Secure, SameSite=Lax, Path=/이며 Domain은 별도로 지정하지 않는 기준입니다.
- API 요청은 세션 쿠키를 전송합니다. 브라우저 JavaScript는 세션 쿠키 또는 GitHub 토큰을 직접 읽거나 보관하지 않습니다.
- 로그인 전 사용 가능: 로그인 시작, GitHub 콜백, 내 로그인 정보, CSRF 토큰 조회. 로그아웃은 유효 CSRF가 있으면 비로그인 세션에서도 204.
- 계정 QR 저장·목록·미리보기·다운로드·삭제에는 로그인 필수. 인증 누락·만료는 JSON 401이며 GitHub 로그인 HTML로 자동 리다이렉트하지 않습니다.
- 로그인된 사용자의 POST·DELETE 요청은 CSRF 헤더 필수. 토큰 누락·불일치는 JSON 403.
- 로그인·로그아웃 뒤 CSRF 토큰을 새로 조회합니다. 세션 인증과 CSRF 처리는 Spring Security 필터 오류에도 같은 JSON 계약을 적용하도록 구현해야 합니다.
- GitHub 인증에는 state와 PKCE S256을 적용합니다. 저장소 권한은 요청하지 않습니다.
### 소유권과 민감 정보
- 소유자 userId는 현재 세션에서 가져옵니다. 요청에서 지정한 userId는 허용하지 않습니다.
- 타인의 QR과 존재하지 않거나 삭제된 QR은 모두 404 QR_NOT_FOUND로 응답해 존재 여부를 구분하지 않습니다.
- 저장된 payload는 암호화합니다. 목록·성공 JSON·오류·로그에 평문 payload를 포함하지 않습니다.
- Wi-Fi 비밀번호와 연락처 상세는 목록 요약에서 제외합니다. QR 이미지 자체는 읽으면 내용을 알 수 있으므로 미리보기 파일도 인증된 사용자에게만 제공합니다.
- QR 삭제는 보관 데이터를 제거합니다. 이미 받은 고정형 QR을 만료시키거나 회수하지 않습니다.
- SVG에는 입력 문자열을 삽입하지 않고 QR 행렬의 숫자 좌표만 사용합니다.
### 공통 오류 응답
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력 내용을 확인해 주세요.",
    "fieldErrors": [
      {
        "field": "title",
        "message": "QR 이름을 입력해 주세요."
      }
    ]
  },
  "requestId": "req-example-001"
}
```
- error.code는 프로그램 판단용, message는 안전한 사용자 문구입니다.
- fieldErrors는 필드 오류일 때만 포함하며 입력값 자체를 반환하지 않습니다.
- requestId는 서버가 만든 추적 값이며 저장 재시도의 Idempotency-Key와 다릅니다.
- 스택 추적·DB 오류·GitHub 토큰·CSRF 토큰·비밀번호·연락처 원문을 포함하지 않습니다.
| HTTP | code | 의미 |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | 필수 항목·형식·이름·UUID·Query 오류 |
| 401 | AUTH_REQUIRED | 계정 API에서 로그인 필요 또는 세션 만료 |
| 403 | CSRF_INVALID | 로그인 상태의 변경 요청에 CSRF 누락·불일치 |
| 404 | QR_NOT_FOUND | 조회 가능한 본인 QR 없음 |
| 409 | IDEMPOTENCY_CONFLICT | 같은 저장 키에 다른 내용 사용 |
| 409 | SAVE_IN_PROGRESS | 같은 저장 작업이 처리 중. Retry-After 확인 |
| 409 | QR_ALREADY_DELETED | 이미 처리 후 삭제된 저장 작업. 자동 복원 금지 |
| 413 | REQUEST_TOO_LARGE | 요청 JSON 64 KiB 초과 |
| 415 | UNSUPPORTED_MEDIA_TYPE | 저장 요청이 application/json이 아님 |
| 422 | INVALID_QR_PAYLOAD | 유형별 페이로드 규칙 불일치 |
| 422 | QR_TOO_LONG | 실제 QR 생성 용량 초과 |
| 500 | QR_GENERATION_FAILED | QR 생성 실패 |
| 500 | SAVE_FAILED / LIST_FAILED / DOWNLOAD_FAILED / DELETE_FAILED | 각 서버 작업 실패 |
| 500 | INTERNAL_ERROR | 기타 서버 처리 실패 |
### 화면 오류 문구와 복구
| 상태 | 확정 문구 | 복구 |
| --- | --- | --- |
| 용량 초과 | 내용이 너무 길어요. 내용을 줄여 다시 시도해 주세요. | 이전 QR 제거, 다운로드·저장 비활성화, 입력 수정 |
| 생성 실패 | QR을 만들지 못했어요. 내용을 확인하고 다시 시도해 주세요. | 입력 유지, 다시 생성 |
| 저장 실패 | QR을 저장하지 못했어요. 잠시 후 다시 시도해 주세요. | 저장 창·QR 이름·입력 유지, 같은 Idempotency-Key로 다시 저장 |
| 다운로드 실패 | 파일을 준비하지 못했어요. 잠시 후 다시 시도해 주세요. | 대상 QR·형식 유지, 다시 다운로드 |
| 계정 인증 만료 | GitHub 로그인 후 다시 시도해 주세요. | 원래 입력·이름 유지 후 로그인 |
| 저장 QR 삭제·접근 불가 | 이 QR을 다운로드할 수 없어요. 내 QR 목록을 새로고침해 주세요. | 목록 새로고침, 해당 항목 파일 재시도 없음 |
비로그인 다운로드에는 서버 인증 만료 처리를 적용하지 않습니다. 파일 준비 중에는 중복 실행을 막고, 오류 JSON을 다운로드 파일로 저장하지 않습니다. 브라우저의 저장 취소는 서비스 실패로 표시하지 않습니다.
### 구현·검사 순서
1. 세션 로그인과 내 정보·CSRF·로그아웃.
2. QR 암호화 저장과 같은 키 재시도·동시 요청 검증.
3. 내 QR 목록과 계정 격리.
4. 저장 QR PNG/SVG 재생성·디코딩·미리보기.
5. QR 삭제 확인·삭제 후 재조회와 다운로드 차단.
**현재 확인한 것은 문서의 구조와 설계 일치 여부입니다.** 실제 로그인·API·DB·다운로드·소유권 검사는 서버 구현 후 진행합니다. 기존 QR 모듈의 자동 디코딩 검사를 서버 API 검사 완료로 간주하지 않습니다.
### 공식 참고
- [GitHub OAuth 앱 웹 인증 흐름](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps): state와 PKCE 및 서버 토큰 교환.
- [Spring Security CSRF](https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html): 세션 기반 토큰, JavaScript 요청과 로그인·로그아웃 후 토큰 갱신.
## 브라우저 처리 명세
### 입력·검증·페이로드 변환
다섯 유형은 하나의 QR 생성기를 공유합니다. 입력 검증과 변환은 화면 코드에서 분리하고, 로그인 여부와 관계없이 브라우저에서 수행합니다. 계정 저장 때만 `POST /api/qrs`로 type·title·payload를 보냅니다.
| 유형 | 입력과 필수값 | QR 내용과 변환 규칙 | 시안의 필드 오류 문구 |
| --- | --- | --- | --- |
| URL | 웹 주소 필수 | http:// 또는 `https://`의 유효한 주소. 쿼리·해시·인코딩을 포함해 검증된 원문 유지 | 주소 앞에 http:// 또는 `https://`를 포함해 주세요. |
| WIFI | SSID 필수. 비밀번호 사용일 때 비밀번호 필수 | WPA 또는 nopass. 공개 네트워크는 P 항목 생략. SSID·비밀번호의 앞뒤 공백 보존, 특수문자 이스케이프와 16진수 값 규칙 적용 | 네트워크 이름을 입력해 주세요. / 비밀번호를 입력해 주세요. |
| CONTACT | 성과 이름 중 하나 이상. 전화번호·이메일·회사·웹사이트 선택 | vCard 3.0의 N·FN, CRLF 줄 구분, 값 이스케이프와 긴 줄 접기. 웹사이트는 http:// 또는 https:// | 성과 이름 중 하나는 입력해 주세요. / 올바른 이메일 주소를 입력해 주세요. / 웹사이트 주소는 http:// 또는 `https://`로 시작해야 해요. |
| TEXT | 공백만 있는 내용 불가 | 유효한 UTF-8 텍스트 원문. 유효한 내용의 앞뒤 공백·줄바꿈 유지 | 내용을 입력해 주세요. |
| EMAIL | 받는 이메일 주소 필수. 제목·본문 선택 | mailto: URI. 제목·본문을 URL 인코딩. QR 스캔은 메일 작성 화면 열기 | 올바른 이메일 주소를 입력해 주세요. |
위 문구는 로컬 SVG 수정본에 있는 경우의 문구입니다. 시안에 없는 세부 형식 오류는 설계 규칙에 맞춰 추가 정의할 수 있으며, 기존 문구를 임의로 바꾸지 않습니다.
### 비로그인 사용·입력 유지
- `비로그인으로 사용하기`: 생성 화면으로 이동합니다. 기존 입력을 지우지 않고 인증·저장 API를 호출하지 않습니다.
- 유형별 입력은 현재 탭 메모리에 유지합니다. 새로고침·탭 종료 후에는 사라집니다. 서버·브라우저 저장소에 보관하지 않습니다.
- 입력 오류·용량 초과·생성 실패 시 이전 QR을 숨기고 다운로드·저장을 비활성화합니다. 입력 수정 후에는 현재 입력으로 다시 생성합니다.
- Wi-Fi `보기 / 가리기`는 입력값·페이로드를 바꾸지 않습니다. 공개 네트워크 또는 다른 유형으로 전환하면 가림 상태로 돌아갑니다. 공개 네트워크에서는 비밀번호 필드와 P 항목을 제외합니다.
### 비로그인 PNG·SVG 내보내기
| 항목 | 계약 |
| --- | --- |
| 진입 | 생성 화면의 QR 다운로드 → PNG 또는 SVG 선택 |
| 대상 | 형식 선택 창을 열 때 유효했던 현재 입력·QR 결과. 계정에 저장된 QR과 혼용하지 않음 |
| PNG | 1024×1024, 정수 픽셀 모듈, 검정·흰 배경, 사방 최소 4모듈 여백 |
| SVG | QR 행렬의 숫자 좌표로 만든 벡터, 검정·불투명 흰 배경, 사방 최소 4모듈 여백 |
| 파일명 | qr-url.png · qr-wifi.svg 등 유형과 확장자 포함 |
| 안내 | 계정에 보관하지 않아요. QR은 여러 번 스캔할 수 있어요. |
| 처리 중 | 파일 준비 중… 표시, 중복 실행 차단 |
| 실패 | 선택 창·형식·현재 QR 유지. 공통 다운로드 실패 문구와 다시 다운로드 |
| 인증·저장 | 파일 준비를 위해 인증·QR 저장·목록 API를 호출하지 않음. 자동 계정 보관 없음 |
브라우저가 파일 준비를 마쳤다는 사실과 사용자가 기기에 저장했다는 사실을 구분합니다. 파일 저장 취소는 서비스 실패로 표시하지 않습니다. PNG와 SVG를 다시 디코딩해 원래 payload와 비교합니다.
## 화면별 API 연결
| 화면·동작 | 사용 경로 | 성공·복구 동작 |
| --- | --- | --- |
| 앱 진입·상단 로그인 표시 | GET /api/auth/me | 비로그인 200 응답도 정상. 공개 생성 화면 계속 사용 |
| GitHub로 계속하기·로그인하고 저장 | GET /oauth2/authorization/github → GET /login/oauth2/code/github → GET /api/auth/me | 별도 인증 창. 원래 입력 유지. 저장 목적이면 인증 확인 후 저장 창만 열기 |
| 인증 완료 화면 | /auth/result?status=success 또는 error | 프론트엔드 고정 경로. JSON API가 아님. postMessage 출처·인증 창 확인 후 me로 실제 세션 확인 |
| QR 계정 저장 | GET /api/auth/csrf → POST /api/qrs | 명시적 제출 후 계정 보관. 응답 유실은 같은 Idempotency-Key로 재시도해 결과 확인 |
| 내 QR·유형 필터·목록 새로고침 | GET /api/qrs | 빈 목록과 조회 실패 구분. 필터 변경은 cursor 초기화 |
| 내 QR 썸네일 | GET /api/qrs/\{qrId\}/preview | 소유한 저장 QR만 SVG 표시. 실패해도 목록 항목을 성공적으로 삭제한 것으로 처리하지 않음 |
| 내 QR 다운로드 | GET /api/qrs/\{qrId\}/download?format=png 또는 svg | 단일 다운로드 버튼에서 형식 선택. 401 재로그인, 404 목록 새로고침, 500 선택 형식 재시도 |
| QR 삭제 | 확인 창 → GET /api/auth/csrf → DELETE /api/qrs/\{qrId\} | 취소 시 DELETE 없음. 성공 확인 후 목록 제거 |
| 로그아웃 | GET /api/auth/csrf → POST /api/auth/logout | 계정 화면을 닫고 비로그인 상태 갱신. 이후 사용할 CSRF 토큰 재조회 |
CSRF 조회는 매번 새 HTTP 요청을 해야 한다는 뜻이 아닙니다. 현재 세션의 유효 토큰을 메모리에 유지하고 로그인·로그아웃 후 새로 조회합니다.
현재 설계에 필요한 서버 경로는 **10개**입니다. 다섯 유형의 생성·검증·비로그인 다운로드는 브라우저 처리이며 유형별 서버 생성 API를 추가하지 않습니다. QR 수정·회원 탈퇴·동적 QR·한 번 스캔 후 만료는 현재 요구 사항에 포함되지 않습니다.
### 설계 대응 검사
- 설계안의 다섯 입력 유형, 비로그인 다운로드, 인증 창에서 입력 유지, 명시적 계정 저장, 내 QR·필터, 미리보기·재다운로드, 삭제 확인을 위 계약에 대응했습니다.
- 용량 초과·생성·저장·다운로드 실패와 인증 만료·접근 불가의 복구 동작은 공통 규칙 및 각 API 상세 페이지에 연결했습니다.
- 문서의 그룹·Phase·요청과 응답 예시를 확인합니다. 실제 백엔드 동작 검사는 각 Phase 구현 후 수행합니다.

---

## 내 로그인 정보 조회

> 구현 전 API 명세 초안입니다. [API 명세서](https://app.notion.com/p/3f5623549d18800d8c2fdf7157c0b7e3)를 함께 확인합니다.
### 목적
헤더와 저장 흐름에서 현재 로그인 상태를 확인합니다.
### 요청
- 인증: 비로그인도 사용 가능. 세션 쿠키가 있으면 전송합니다.
- Query·Body: 없음.
### 응답
로그인 상태 — 200 OK:
```json
{
  "data": {
    "authenticated": true,
    "user": {
      "id": "67c5eaf6-4bf5-49b2-a9b1-78d4ccfb25ea",
      "githubLogin": "example-user",
      "displayName": "예시 사용자"
    }
  }
}
```
비로그인 또는 세션 만료 — 200 OK:
```json
{
  "data": {
    "authenticated": false,
    "user": null
  }
}
```
### 처리 규칙
- 응답에 GitHub 토큰, 이메일, 내부 권한 정보를 포함하지 않습니다.
- displayName은 표시 이름이 없으면 githubLogin을 사용합니다.
- Cache-Control: no-store.
- 비로그인 QR 생성·다운로드 자체는 이 API 성공을 전제로 하지 않습니다. 서버 장애가 있어도 브라우저 기능은 사용할 수 있습니다.
### 오류
500 INTERNAL_ERROR: 공통 오류 형식. 서버 조회 실패를 `authenticated:false`로 바꾸어 숨기지 않습니다.
### 검사 기준
- 로그인·비로그인·만료 세션의 응답 구분.
- 다른 계정으로 로그인한 뒤 현재 사용자만 표시되는지 확인.
- 응답에 토큰과 불필요한 개인정보가 없는지 확인.

---

## 내 QR 목록 조회

> 구현 전 API 명세 초안입니다. [API 명세서](https://app.notion.com/p/3f5623549d18800d8c2fdf7157c0b7e3)를 함께 확인합니다.
### 목적
내 QR 화면에 제목·유형·민감하지 않은 요약·생성일·썸네일을 표시합니다.
### 요청
- 인증: 로그인 세션 필수. Body 없음.
| Query | 필수 | 규칙 |
| --- | --- | --- |
| type | 선택 | URL · WIFI · CONTACT · TEXT · EMAIL. 전체는 생략 |
| limit | 선택 | 기본 20, 정수 1\~100 |
| cursor | 선택 | 이전 응답의 nextCursor. 내용을 해석하거나 직접 생성하지 않음 |
```javascript
GET /api/qrs?type=URL&limit=20 HTTP/1.1
```
### 응답
200 OK:
```json
{
  "data": {
    "items": [
      {
        "id": "a637c064-3068-4991-b1fc-15e4520356c1",
        "type": "URL",
        "title": "행사 안내",
        "summary": "example.com",
        "createdAt": "2026-10-10T06:00:00Z",
        "previewUrl": "/api/qrs/a637c064-3068-4991-b1fc-15e4520356c1/preview"
      }
    ],
    "totalCount": 1,
    "nextCursor": null,
    "hasNext": false
  }
}
```
저장 항목이 없으면 items: \[\], totalCount: 0, nextCursor: null, hasNext: false입니다.
### 처리 규칙
- 현재 세션 사용자 소유 조건을 서버 조회에 적용합니다. userId Query는 받지 않습니다.
- createdAt 내림차순, 동일 시간은 id 내림차순. cursor는 사용자·필터와 묶어 검증하며 다른 필터에 재사용하면 400.
- totalCount는 같은 사용자와 type 필터 기준의 총 개수입니다. 조회 도중 저장·삭제에 따라 다음 페이지의 개수는 달라질 수 있습니다.
- previewUrl도 로그인과 소유권을 검증하는 경로입니다.
- summary는 서버가 생성합니다. URL은 호스트만, Wi-Fi는 SSID만, CONTACT는 ‘연락처 정보’, TEXT는 ‘텍스트 QR’, EMAIL은 ‘이메일 작성’을 표시합니다. 비밀번호·vCard 상세·본문·URL 쿼리는 목록 JSON에 넣지 않습니다.
- Cache-Control: no-store.
### 오류
400 VALIDATION_ERROR: 잘못된 type·limit·cursor.
401 AUTH_REQUIRED: 로그인 안내로 이동.
500 LIST_FAILED: 기존 목록을 유지하고 다시 불러오기 제공. 빈 목록으로 오인하지 않습니다.
### 검사 기준
- 계정 A/B가 서로의 항목을 조회할 수 없는지 확인.
- 유형 필터, 정렬, 여러 페이지, 빈 목록.
- 응답·로그에 Wi-Fi 비밀번호와 연락처 상세가 없는지 확인.
### 프론트엔드 연결·실패 복구
- 내 QR 진입·목록 새로고침 때 첫 페이지를 조회합니다. 유형 필터를 바꾸면 기존 cursor를 폐기하고 새 첫 페이지를 조회합니다.
- 같은 필터의 다음 페이지는 nextCursor로 조회합니다. 다른 필터의 늦은 응답을 현재 화면에 덮어쓰지 않습니다.
- 최초 조회 성공의 빈 배열은 빈 화면·새 QR 만들기 동작으로 연결합니다. 조회 실패를 항목 없음으로 표시하지 않습니다.
- 추가 페이지 또는 새로고침 실패 시 기존 성공 목록을 유지하고 다시 불러오기를 제공합니다. 인증 만료는 로그인 안내로 연결합니다.
- 썸네일을 읽지 못해도 해당 QR을 삭제된 것으로 확정하지 않습니다. 항목 상태는 목록 새로고침으로 다시 확인합니다.
- 삭제 성공 후 현재 필터와 목록 개수를 다시 맞춥니다. 이미 다운로드한 고정형 QR 파일에는 영향을 주지 않습니다.

---

## 로그아웃

> 구현 전 API 명세 초안입니다. [API 명세서](https://app.notion.com/p/3f5623549d18800d8c2fdf7157c0b7e3)를 함께 확인합니다.
### 목적
서비스 로그인 세션을 종료합니다. GitHub 사이트 자체에서 로그아웃시키지는 않습니다.
### 요청
- 세션 쿠키와 X-CSRF-TOKEN 헤더.
- Body·Query: 없음. Content-Type 불필요.
```javascript
POST /api/auth/logout HTTP/1.1
X-CSRF-TOKEN: <메모리의 CSRF 토큰>
```
### 응답
204 No Content. 응답 본문 없음.
### 처리 규칙
- 서버 세션 무효화, 세션 쿠키 만료, CSRF 토큰 정리.
- 유효한 CSRF 토큰을 가진 비로그인 세션에서도 204를 반환합니다. 기존 로그인이 만료됐다면 CSRF를 새로 조회한 뒤 호출할 수 있습니다.
- 완료 후 프론트엔드는 인증 상태를 초기화하고 비로그인 생성 화면으로 돌아갑니다. 이미 받은 파일은 영향을 받지 않습니다.
- 계정에 저장된 QR을 삭제하지 않습니다.
### 오류
403 CSRF_INVALID: 누락·잘못된 토큰. 새 토큰 조회 후 상태를 다시 확인합니다.
500 INTERNAL_ERROR: 로그아웃 처리 실패.
### 검사 기준
- 로그아웃 후 기존 쿠키로 내 QR 접근 시 401.
- GET 요청으로 로그아웃할 수 없는지 확인.
- 계정 보관 데이터가 유지되고 비로그인 사용이 가능한지 확인.

---

## 저장 QR 다운로드

> 구현 전 API 명세 초안입니다. [API 명세서](https://app.notion.com/p/3f5623549d18800d8c2fdf7157c0b7e3)를 함께 확인합니다.
### 목적
내 QR에 보관한 내용을 PNG 또는 SVG 파일로 다시 받습니다. 비로그인 직접 다운로드는 이 API를 사용하지 않습니다.
### 요청
- 인증: 로그인 세션 필수.
- Path: qrId UUID.
| Query | 필수 | 규칙 |
| --- | --- | --- |
| format | 필수 | 소문자 png 또는 svg. 생략·기타 값은 400 |
```javascript
GET /api/qrs/a637c064-3068-4991-b1fc-15e4520356c1/download?format=png HTTP/1.1
```
### 응답
200 OK, JSON이 아닌 파일 데이터:
```javascript
Content-Type: image/png
Content-Disposition: attachment; filename="qr-url.png"
Cache-Control: no-store
X-Content-Type-Options: nosniff
```
SVG는 Content-Type: image/svg+xml, filename="qr-url.svg". 파일명의 유형은 url/wifi/contact/text/email입니다. 입력 제목을 파일명에 그대로 사용하지 않습니다.
### 처리 규칙
- 현재 사용자의 소유권을 검증하고 저장된 payload에서 다시 생성합니다. 현재 폼의 미저장 내용을 파일에 사용하지 않습니다.
- PNG 1024×1024. 정수 픽셀 크기의 QR 모듈을 가운데 배치하고 남는 공간을 흰색으로 채워 최소 4모듈 여백을 확보합니다.
- SVG는 크기 조정 가능한 벡터. 검정·불투명 흰 배경 유지.
- 저장된 QR을 변경·삭제하지 않습니다.
- 프론트엔드는 응답 상태를 확인한 뒤 파일로 처리합니다. 오류 JSON을 .png 또는 .svg 파일로 저장하지 않습니다.
- 저장 형식 선택과 실패·재시도 동안 해당 QR과 선택 형식을 유지합니다.
### 오류
| HTTP | code | 화면 동작 |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | format 확인 |
| 401 | AUTH_REQUIRED | GitHub 로그인 후 다시 시도해 주세요. |
| 404 | QR_NOT_FOUND | 이 QR을 다운로드할 수 없어요. 내 QR 목록을 새로고침해 주세요. / 목록 새로고침 |
| 500 | DOWNLOAD_FAILED | 파일을 준비하지 못했어요. 잠시 후 다시 시도해 주세요. / 다시 다운로드 |
### 검사 기준
- PNG 크기, SVG, 동일 payload 디코딩과 최소 여백.
- 계정 A/B 분리 및 삭제 후 다운로드 차단.
- 오류 응답을 파일로 저장하지 않는지 확인.
- 브라우저 저장 취소를 서비스 실패로 표시하지 않고 파일 준비 성공만으로 기기 저장 완료를 단정하지 않는지 확인.

---

## CSRF 토큰 조회

> 구현 전 API 명세 초안입니다. [API 명세서](https://app.notion.com/p/3f5623549d18800d8c2fdf7157c0b7e3)를 함께 확인합니다.
### 목적
계정 저장·로그아웃·QR 삭제 요청에 사용할 CSRF 토큰을 가져옵니다.
### 요청
- 인증: 비로그인도 호출 가능. 기존 세션 쿠키를 함께 보냅니다.
- Query·Body: 없음.
### 응답
200 OK:
```json
{
  "data": {
    "headerName": "X-CSRF-TOKEN",
    "parameterName": "_csrf",
    "token": "example-csrf-token-not-a-real-secret"
  }
}
```
### 처리 규칙
- HttpSessionCsrfTokenRepository 기반으로 세션과 묶인 토큰을 발급합니다. 실제 토큰을 생성해 응답에 포함합니다.
- 프론트엔드는 token을 메모리에만 유지하고 headerName에 해당하는 헤더로 전송합니다.
- 로그인·로그아웃으로 토큰이 변경될 수 있으므로 이후 새 토큰을 조회합니다.
- Cache-Control: no-store. 토큰을 로그·URL·브라우저 저장소에 기록하지 않습니다.
- 비로그인 QR 생성·다운로드에는 CSRF 토큰 조회가 필요하지 않습니다.
### 오류
500 INTERNAL_ERROR: 발급 실패. 기존 토큰이 유효하다고 가정해 POST·DELETE를 진행하지 않습니다.
### 검사 기준
- 토큰 없이 또는 다른 세션의 토큰으로 저장·삭제할 때 차단되는지 확인.
- 정상 토큰으로 처리되는지 확인.
- 로그인 전 토큰이 로그인 후 그대로 사용되지 않는지 확인.

---

## GitHub 로그인 시작

> 구현 전 API 명세 초안입니다. [API 명세서](https://app.notion.com/p/3f5623549d18800d8c2fdf7157c0b7e3)를 함께 확인합니다.
### 목적
GitHub 인증 창을 열어 계정 보관 기능을 사용할 수 있게 합니다. QR 입력은 원래 탭에 유지합니다.
### 요청
- 인증: 로그인 전 사용 가능.
- 호출: 버튼 클릭에서 별도 창을 열어 이 경로로 이동합니다. fetch로 호출하지 않습니다.
- Query·Body: 없음. QR 내용이나 임의의 returnUrl을 URL에 넣지 않습니다.
### 응답
- 302 Found: GitHub 인증 페이지로 이동.
- 서버가 state와 PKCE S256 값을 생성하고 서버 세션에 묶습니다. 클라이언트가 값을 지정하지 않습니다.
### 처리 규칙
- GitHub 저장소 권한(repo)은 요청하지 않습니다. 계정 식별에 필요한 최소 정보만 사용합니다.
- 이미 로그인했으면 설정된 동일 출처의 인증 완료 화면으로 이동합니다.
- 팝업 차단은 프론트엔드에서 다시 열기 안내를 표시합니다. 원래 입력 탭을 GitHub로 이동시키지 않습니다.
- state·인가 코드·토큰·QR 페이로드를 로그에 기록하지 않습니다.
### 실패와 화면
인증 시작 또는 사용자 취소·로그인 실패 시 로그인 실패 시안을 표시하고 입력을 유지합니다. `GitHub로 계속하기`와 `비로그인으로 사용하기`를 제공합니다.
### 검사 기준
- 팝업에서 인증을 진행해도 원래 탭의 다섯 유형 입력이 유지되는지 확인.
- state·PKCE를 서버에서 생성하고 저장소 권한을 요청하지 않는지 확인.
- 팝업 차단·취소 후에도 비로그인 사용이 가능한지 확인.

---

## GitHub 로그인 콜백

> 구현 전 API 명세 초안입니다. [API 명세서](https://app.notion.com/p/3f5623549d18800d8c2fdf7157c0b7e3)를 함께 확인합니다.
### 목적
GitHub가 전달한 인증 결과를 검증하고 애플리케이션 세션을 생성합니다.
### 요청
- 호출 주체: GitHub 인증 리다이렉트. Spring Security OAuth2 Login 처리 경로입니다.
| Query | 필수 | 설명 |
| --- | --- | --- |
| code | 성공 시 필수 | GitHub가 발급한 일회성 인가 코드 |
| state | 필수 | 로그인 시작 때 서버 세션에 묶인 값 |
| error | 실패 시 전달 | 사용자 취소 등 GitHub 오류 |
### 응답
- 성공: 302 Found → 같은 출처의 고정된 인증 완료 화면 `/auth/result?status=success`. HttpOnly 세션 쿠키 설정.
- 실패: 302 Found → `/auth/result?status=error`. 새 로그인 세션을 만들지 않습니다.
- 완료 화면은 JSON API가 아닙니다. 브라우저 접근 경로이며 고정된 상태 값만 표시합니다.
### 처리 규칙
1. state가 존재하고 서버 세션의 값과 일치하는지 확인합니다. 검증 후 재사용을 막습니다.
2. 서버가 보관한 PKCE verifier와 인가 코드로 GitHub 토큰을 교환합니다.
3. GitHub 계정을 애플리케이션 사용자에 연결합니다. 첫 로그인 때 내부 사용자 레코드를 생성하며 별도 회원가입 API는 없습니다.
4. 인증 성공 시 세션 ID를 교체합니다. GitHub 토큰과 client secret은 브라우저로 반환하지 않습니다.
5. 완료 창에서 원래 창으로 `{type:"qr-auth",status:"success"}` 또는 `status:"error"`만 전달합니다. postMessage의 targetOrigin은 실제 서비스의 정확한 출처입니다.
6. 원래 창은 event.origin, event.source가 기대한 인증 팝업인지 확인한 뒤 내 정보 API를 다시 조회합니다. 메시지만으로 로그인 성공을 결정하지 않습니다.
7. QR을 자동 저장하지 않습니다. `로그인하고 저장`에서 시작한 경우 인증 확인 후 저장 창을 엽니다.
### 실패와 화면
state 불일치·만료, 인가 코드 재사용, 토큰 교환 실패는 모두 로그인 실패 화면으로 복구합니다. 내부 원인이나 토큰은 사용자 문구에 포함하지 않습니다.
### 검사 기준
- 정상 로그인, 취소, state 변조·누락, callback 재사용, GitHub 응답 실패.
- 새 세션 ID와 쿠키 속성 확인.
- 인증 완료 시 원래 QR 입력 유지와 자동 저장 없음 확인.

---

## QR 계정 저장

> 구현 전 API 명세 초안입니다. [API 명세서](https://app.notion.com/p/3f5623549d18800d8c2fdf7157c0b7e3)를 함께 확인합니다.
### 목적
현재 생성한 QR을 로그인한 사용자의 내 QR에 보관합니다. 비로그인 다운로드는 이 API를 호출하지 않습니다.
### 요청
| 헤더 | 필수 | 설명 |
| --- | --- | --- |
| Content-Type | 필수 | application/json |
| X-CSRF-TOKEN | 필수 | 현재 세션의 CSRF 토큰 |
| Idempotency-Key | 필수 | 클라이언트가 저장 작업마다 생성한 UUID. 같은 작업의 재시도에는 같은 값 |
```json
{
  "type": "URL",
  "title": "행사 안내",
  "payload": "https://example.com"
}
```
| Body | 타입 | 규칙 |
| --- | --- | --- |
| type | string | URL · WIFI · CONTACT · TEXT · EMAIL 중 하나 |
| title | string | 앞뒤 공백 제거 후 1\~100 Unicode code point. 표시 이름은 HTML로 렌더링하지 않음 |
| payload | string | QR에 담는 원문. 앞뒤 공백을 일괄 제거하지 않음. 유형별 규칙 검증 및 QR 생성 가능 여부 확인 |
#### 유형별 payload 예시
아래 값은 테스트용 가상 정보입니다.
```json
[
  {
    "type": "URL",
    "title": "행사 안내",
    "payload": "https://example.com?source=qr#apply"
  },
  {
    "type": "WIFI",
    "title": "예시 와이파이",
    "payload": "WIFI:T:WPA;S:EXAMPLE_WIFI;P:example-only-1234;;"
  },
  {
    "type": "CONTACT",
    "title": "연락처",
    "payload": "BEGIN:VCARD\r\nVERSION:3.0\r\nN:김;민지;;;\r\nFN:김 민지\r\nEND:VCARD\r\n"
  },
  {
    "type": "TEXT",
    "title": "안내 문구",
    "payload": "행사장 입구에서 안내를 확인해 주세요."
  },
  {
    "type": "EMAIL",
    "title": "이메일 작성",
    "payload": "mailto:hello@example.com?subject=%EC%95%88%EB%82%B4"
  }
]
```
#### 유형별 서버 검증
클라이언트가 만든 payload 문자열을 검증하고 저장합니다. 사용자에게 보이는 입력 필드는 프론트엔드에서 먼저 검증하지만, 서버는 이 결과를 신뢰해 검증을 생략하지 않습니다. 서버가 payload를 재직렬화하거나 원문을 자동으로 수정하지 않습니다.
| type | 허용 형식 | 검증·보존 기준 |
| --- | --- | --- |
| URL | http:// 또는 https:// URL | 유효한 주소인지 확인. 쿼리·해시·인코딩을 포함한 검증된 원문 보존 |
| WIFI | WIFI:의 WPA 또는 nopass | S는 빈 문자열 불가. WPA는 P 필수. nopass는 P 생략. 기업용·WEP 제외. 이스케이프를 해석한 SSID·비밀번호의 공백 보존, 제어 문자·줄바꿈 거절 |
| CONTACT | vCard 3.0 | BEGIN:VCARD·VERSION:3.0·N·FN·END:VCARD 필수. 성·이름 중 하나 이상, CRLF 줄 구분·이스케이프·줄 접기 규칙 확인. 선택 이메일·웹사이트 형식 검사 |
| TEXT | 유효한 Unicode 텍스트 | 공백만 있는 값 거절. 허용한 원문 공백·줄바꿈을 그대로 보존 |
| EMAIL | mailto: URI | 받는 주소 필수·형식 검사. 선택 subject·body는 URI 인코딩. 내용은 메일 발송 요청으로 처리하지 않음 |
Wi-Fi는 입력 값의 역슬래시·세미콜론·쉼표·큰따옴표·콜론을 이스케이프합니다. 짝수 길이 ASCII 16진수만 있는 값은 문자열 오인을 막기 위해 따옴표로 감싸되, 64자리 16진수 암호키는 감싸지 않습니다. 프론트엔드와 서버의 검증 예제를 공유해 스캔 결과가 원래 SSID·비밀번호와 일치하는지 확인합니다.
연락처 N은 성·이름을 별도 구성 요소에 담고 FN은 성·이름을 순서대로 공백 한 칸으로 연결합니다. 한쪽만 입력한 연락처도 허용합니다. 서버의 422 오류는 입력 내용을 반사하지 않는 공통 오류 형식을 사용합니다.
### 공개 네트워크와 줄바꿈 예시
아래는 각각 독립된 저장 요청의 body입니다. 공개 Wi-Fi에 비밀번호가 없다는 점과 TEXT의 줄바꿈을 확인합니다.
```json
{
  "type": "WIFI",
  "title": "공개 네트워크",
  "payload": "WIFI:T:nopass;S:EXAMPLE_PUBLIC;;"
}
```
```json
{
  "type": "TEXT",
  "title": "행사 안내",
  "payload": "첫 번째 줄\n두 번째 줄"
}
```
#### 저장 결과가 불명확할 때
- 제출 전에 현재 type·title·payload와 Idempotency-Key를 메모리에 고정합니다.
- 타임아웃·연결 끊김·SAVE_IN_PROGRESS에서는 창과 입력을 유지합니다. 같은 body·같은 키로 재요청해 이미 성공한 결과를 200으로 확인할 수 있습니다.
- 처리 중이면 Retry-After 이후 재시도를 허용합니다. 무한 자동 재시도하지 않고 다시 저장 동작으로 복구합니다.
- 인증 만료는 재로그인 후 CSRF를 갱신하고, 입력을 바꾸지 않았다면 같은 작업으로 재시도합니다.
- 성공한 201 또는 재시도 200 응답을 확인한 경우에만 저장 완료로 처리합니다.
### 응답
최초 저장 — 201 Created, Location: /api/qrs/a637c064-3068-4991-b1fc-15e4520356c1.
```json
{
  "data": {
    "id": "a637c064-3068-4991-b1fc-15e4520356c1",
    "type": "URL",
    "title": "행사 안내",
    "summary": "example.com",
    "createdAt": "2026-10-10T06:00:00Z"
  }
}
```
같은 키·같은 요청의 성공 재시도 — 200 OK, 같은 id와 저장 정보를 반환합니다. QR을 추가 생성하지 않습니다.
### 처리 규칙
- userId·createdAt·summary는 서버가 결정합니다. 클라이언트가 소유자를 지정할 수 없습니다.
- payload 형식, type과의 일치, 필수값, 잘못된 UTF-16, QR 용량을 서버에서도 검증합니다. SVG/PNG 파일이나 임의 마크업을 저장 요청으로 받지 않습니다.
- URL/Wi-Fi/vCard/텍스트/mailto 검증은 설계안과 같은 규칙을 사용합니다. 원문을 URL 정규화 등으로 바꾸지 않습니다.
- 요청 JSON 전체 64 KiB까지 허용한다는 초안 정책입니다. 실제 QR 수용량은 생성 결과로 판단하며 바이트 수만으로 성공을 보장하지 않습니다.
- 검증 후 payload를 암호화해 보관합니다. 응답과 로그에는 payload를 넣지 않습니다.
- 사용자와 Idempotency-Key의 조합에 고유 제약을 둡니다. 요청 내용의 비교용 값은 서버 비밀키로 만든 HMAC이며 평문 비밀번호를 남기지 않습니다.
- 저장과 키 기록을 한 트랜잭션으로 처리합니다. 동시 요청도 한 항목만 만들어야 합니다.
- 같은 키에 다른 type/title/payload를 보내면 409 IDEMPOTENCY_CONFLICT. 같은 작업이 처리 중이면 409 SAVE_IN_PROGRESS와 Retry-After를 반환합니다.
- QR을 삭제해도 최소한의 사용한 키 기록은 유지합니다. 삭제된 QR에 대한 동일 저장 요청은 409 QR_ALREADY_DELETED로 거절하고 내용을 복원하지 않습니다. 삭제 후 새 보관은 새 키로 명시적으로 요청합니다.
- 입력을 바꾸지 않은 재시도는 같은 키를 사용합니다. 저장 내용이 바뀌면 별도의 새 작업 키를 사용합니다.
### 오류
| HTTP | code | 화면 동작 |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | QR 이름 또는 요청 형식 오류. 해당 위치 표시 |
| 401 | AUTH_REQUIRED | 입력·이름 유지 후 GitHub 로그인 |
| 403 | CSRF_INVALID | 새 토큰 조회. 창과 입력 유지 |
| 409 | IDEMPOTENCY_CONFLICT / SAVE_IN_PROGRESS / QR_ALREADY_DELETED | 중복·진행 상태 확인. 새 항목을 성공으로 표시하지 않음 |
| 413 | REQUEST_TOO_LARGE | 요청 크기 초과. 입력을 줄이도록 안내 |
| 422 | INVALID_QR_PAYLOAD / QR_TOO_LONG | 유형별 입력 또는 용량 오류 |
| 500 | QR_GENERATION_FAILED / SAVE_FAILED | 저장 실패 문구, 다시 저장 |
### 검사 기준
- 다섯 유형 저장과 암호화 데이터 확인.
- 같은 키의 동시 요청·응답 유실 후 재시도로 한 항목만 생성되는지 확인.
- 다른 사용자 id를 요청에 넣어도 소유자를 바꿀 수 없는지 확인.
- 실패 시 저장 창·입력·이름 유지, 성공 확인 전 목록 추가 없음 확인.
- 삭제 후 같은 키 재시도로 QR이 복원되지 않는지 확인.

---

## QR 삭제

> 구현 전 API 명세 초안입니다. [API 명세서](https://app.notion.com/p/3f5623549d18800d8c2fdf7157c0b7e3)를 함께 확인합니다.
### 목적
사용자가 선택한 보관 QR을 계정 목록과 저장소에서 제거합니다.
### 요청
- 인증: 로그인 세션과 X-CSRF-TOKEN 필수.
- Path: qrId UUID.
- Query·Body: 없음.
```javascript
DELETE /api/qrs/a637c064-3068-4991-b1fc-15e4520356c1 HTTP/1.1
X-CSRF-TOKEN: <메모리의 CSRF 토큰>
```
### 응답
204 No Content. 응답 본문 없음.
### 처리 규칙
- 화면 버튼 문구는 `QR 삭제`. 확인 창에서 실행을 승인했을 때만 요청합니다.
- 현재 사용자 소유 조건으로 삭제합니다. 다른 사용자의 QR은 삭제할 수 없습니다.
- 저장된 payload·제목·관련 이미지 캐시를 제거합니다. 이미 받은 고정형 QR 파일은 회수하거나 만료시키지 않습니다.
- 중복 저장 방지용 최소 키 사용 기록에는 payload를 남기지 않고 유지합니다. 같은 저장 요청으로 삭제 항목을 복원하지 않습니다.
- 성공 후 목록을 다시 조회합니다. 처리 중 중복 삭제 버튼을 막습니다.
- 응답 유실 후 다시 삭제하면 404일 수 있습니다. 목록을 조회해 실제 삭제 여부를 확인하고 화면을 복구합니다.
### 오류
400 VALIDATION_ERROR: 잘못된 UUID.
401 AUTH_REQUIRED: 로그인 필요.
403 CSRF_INVALID: 새 토큰 조회.
404 QR_NOT_FOUND: 없거나 이미 삭제됐거나 타인 항목. 동일 코드·문구.
500 DELETE_FAILED: 목록을 임의로 지우지 않고 실패 안내 후 재시도.
### 검사 기준
- 확인 창 취소 시 API 호출 없음.
- 삭제 후 재조회·미리보기·다운로드 불가.
- 타인 항목 접근 차단, CSRF 없는 삭제 차단.
- 응답 유실·연속 클릭·이미 삭제 항목 처리 확인.

---

## 저장 QR 미리보기

> 구현 전 API 명세 초안입니다. [API 명세서](https://app.notion.com/p/3f5623549d18800d8c2fdf7157c0b7e3)를 함께 확인합니다.
### 목적
내 QR 목록의 QR 썸네일을 표시합니다.
### 요청
- 인증: 로그인 세션 필수.
- Path: qrId UUID.
- Query·Body: 없음.
### 응답
200 OK, JSON이 아닌 SVG 이미지:
```javascript
Content-Type: image/svg+xml
Content-Disposition: inline; filename="qr-url.svg"
Cache-Control: no-store
X-Content-Type-Options: nosniff
```
### 처리 규칙
- 조회 때마다 소유권을 확인한 뒤 저장된 암호화 payload를 복호화해 QR을 생성합니다.
- 검정 모듈·흰 배경·사방 4모듈 여백을 유지합니다.
- SVG는 행렬의 숫자 좌표로만 만들며 payload를 SVG 문자열·스크립트·외부 링크로 삽입하지 않습니다.
- QR 이미지 자체는 스캔하면 저장 내용을 읽을 수 있으므로 공개 이미지 URL이나 영구 토큰 링크로 제공하지 않습니다.
### 오류
400 VALIDATION_ERROR: 잘못된 UUID.
401 AUTH_REQUIRED: 로그인 필요.
404 QR_NOT_FOUND: 없거나 삭제됐거나 다른 계정의 QR. 같은 코드·문구로 응답.
500 QR_GENERATION_FAILED: 서버 생성 실패. JSON 공통 오류 응답.
### 검사 기준
- 저장한 원문을 이미지에서 다시 읽어 비교.
- 타인·삭제 항목의 이미지 접근 차단.
- 여백·불투명 흰 배경·SVG에 사용자 마크업 없음 확인.
