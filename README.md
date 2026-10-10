# QR Generator

웹 주소·와이파이·연락처·텍스트·이메일을 위한 QR 생성 웹앱 프로젝트.

**React/TypeScript/Vite 데스크톱 화면 퍼블리싱을 완료했다.** 실제 앱에서는 다섯 유형 입력·검증·QR 미리보기·비로그인 PNG/SVG 다운로드가 동작한다. 입력은 현재 탭 메모리에만 유지한다. 로그인·내 QR·저장·다운로드·삭제 및 실패 화면은 별도 퍼블리싱 미리보기에서 예시 데이터로 확인한다. GitHub 로그인과 계정 서버 API는 아직 연결 전이며 실제 앱의 GitHub 버튼은 준비 중으로 표시한다.

기능 기준은 [설계안](docs/설계안.md), 작업 규칙은 [AGENTS.md](AGENTS.md), 자료 비교와 다음 단계는 [구현 현황](docs/구현현황.md)을 참고한다. [API 명세서](docs/API명세서.md)는 노션의 공통 규칙과 서버 API 10개를 옮긴 구현 전 초안이다.

화면별 확인 방법과 서버 연결 지점은 [퍼블리싱 안내](docs/퍼블리싱.md)에 정리했다. 내 QR의 URL 요약은 호스트만 표시하며 원래 주소는 QR 파일에 유지한다.

화면 기준은 [로컬 SVG 수정본](docs/design/QR_생성_전체_화면시안_수정본.svg)이다. 기존 24개 화면과 GitHub 인증 진행·팝업 차단·원래 화면 복귀 시안 3개를 포함한 27개 화면이며, 사용자가 Figma에 붙여넣어 반영한다. 추가 인증 시안과 자동 가입 안내 문구는 아직 웹앱에 반영하지 않았다. [GitHub 가입·로그인 와이어프레임](docs/design/QR_GitHub_가입로그인_와이어프레임.svg)에는 관련 5개 화면만 모았다.

비로그인도 PNG·SVG를 바로 다운로드한다. 계정에 보관하지 않으며, 받은 파일은 여러 번 스캔할 수 있다. 다운로드 형식 선택 시 PNG는 1024×1024픽셀, SVG는 벡터 파일로 준비한다. 새로고침하면 미저장 입력은 사라진다.

## 설치와 검사

Node.js 22.12 이상에서 저장소 루트 기준. [Vite 실행 조건](https://vite.dev/guide/)을 따른다.

```sh
npm ci
npm run dev
```

`http://localhost:5173/`는 실제 비로그인 앱, `http://localhost:5173/publishing.html`은 화면 확인용 예시이다. 미리보기 상단의 선택 메뉴에서 로그인·내 QR·모달·실패 화면을 확인한다. 예시 로그인·저장·삭제 결과는 새로고침하면 초기화된다. 모바일 화면은 이번 범위에서 제외한다.

```sh
npm test
npm run typecheck
npm run build
```

`npm run build`는 `frontend/dist`에 실제 앱 `index.html`과 화면 예시 `publishing.html`을 함께 생성한다. `npm run preview`로 빌드 결과를 확인할 수 있다. 운영 배포 시 화면 예시를 공개할지는 배포 단계에서 결정한다.

브라우저 검사에는 Playwright 브라우저가 필요하다.

```sh
npx playwright install chromium
npm run test:browser
```

Windows에서 설치된 Edge를 사용할 수도 있다.

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm run test:browser
```

배포용 빌드에서도 파일 디코딩과 전체 예시 화면을 검사한다. 먼저 `npm run build`를 실행한다.

```powershell
$env:QR_TEST_BUILD = '1'
npm run test:browser --workspace frontend -- --grep "all five types|every publishing scene"
Remove-Item Env:QR_TEST_BUILD
```

의존성 버전은 package.json과 package-lock.json에 고정한다. 첫 설치에 네트워크가 필요하다.

## 모듈 인터페이스

`frontend/src/qr/url.ts`의 `validateUrl(input)`은 HTTP/HTTPS 주소를 확인하고 `{ ok: true, payload }` 또는 필드 오류를 반환한다. 원문을 정규화하지 않으며, URL 파서가 묵시적으로 보정하는 공백·제어 문자·역슬래시·과도한 슬래시는 오류로 처리한다.

`frontend/src/qr/generate.ts`의 `generateQr(payload)`은 `{ ok: true, matrix, svg, quietZone: 4 }` 또는 생성 오류를 반환한다. 검정 모듈과 불투명 흰 배경을 사용하며, 페이로드를 SVG 마크업에 넣지 않는다. QR 라이브러리의 오류 정정 수준은 M이다. 용량 초과와 생성 실패의 message는 설계안의 `시안 보완 확정 UI`에 확정한 문구와 일치한다.

```ts
import { validateUrl } from './frontend/src/qr/url.js';
import { generateQr } from './frontend/src/qr/generate.js';

const input = validateUrl('https://example.com');
if (input.ok) {
  const qr = generateQr(input.payload);
  if (qr.ok) {
    // qr.svg는 미리보기, prepareQrFile은 PNG/SVG 파일 준비에 사용한다.
    // 계정 저장은 후속 인증 및 저장 API 구현 이후 연결한다.
  }
}
```

`frontend/src/qr/payload.ts`의 `buildPayload(input)`은 다섯 유형 입력을 검증하고 문자열 페이로드 또는 필드 오류를 반환한다. Wi-Fi 이스케이프, vCard CRLF·UTF-8 줄 접기, mailto 인코딩을 화면 코드와 분리한다. 이메일 입력의 지원 범위는 설계안에 기록한다.

`frontend/src/qr/export.ts`의 `prepareQrFile(qr, type, format)`은 네트워크·저장소를 사용하지 않고 파일 Blob을 만든다. PNG는 정수 크기 모듈과 최소 4모듈 여백을 가진다. SVG에도 흰 배경과 같은 페이로드를 유지한다.

테스트에서는 실제 생성 SVG와 브라우저에서 받은 PNG/SVG를 sharp로 읽고 독립 라이브러리 jsQR로 디코딩해 원문과 비교한다. 브라우저 검사는 유형 전환·비밀번호 보기/가리기·공개 네트워크·오류 복구·모달 포커스·새로고침·인증 및 저장 API 미호출·브라우저 저장소 미사용을 포함한다. Android·iOS 카메라와 실제 계정 API 검증은 후속 작업이다.

라이브러리 API 참고: [node-qrcode](https://github.com/soldair/node-qrcode), [jsQR](https://github.com/cozmo/jsQR).
