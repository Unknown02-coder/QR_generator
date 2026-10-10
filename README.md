# QR Generator

웹 주소·와이파이·연락처·텍스트·이메일을 위한 QR 생성 웹앱 프로젝트.

현재는 첫 단계인 **URL 검증과 공통 QR 행렬/SVG 생성 모듈**만 구현되어 있다. React 화면, GitHub 로그인, 저장, 내 QR, PNG/SVG 다운로드, 삭제는 아직 동작하지 않는다. `npm run build`는 현재 TypeScript 모듈 빌드이며 웹앱 배포 빌드가 아니다.

기능 기준은 [설계안](docs/설계안.md), 작업 규칙은 [AGENTS.md](AGENTS.md), 자료 비교와 다음 단계는 [구현 현황](docs/구현현황.md)을 참고한다.

## 설치와 검사

Node.js 22 이상에서 저장소 루트 기준:

```sh
npm ci
npm test
npm run typecheck
npm run build
```

의존성 버전은 package.json과 package-lock.json에 고정한다. 첫 설치에 네트워크가 필요하다.

## 모듈 인터페이스

`frontend/src/qr/url.ts`의 `validateUrl(input)`은 HTTP/HTTPS 주소를 확인하고 `{ ok: true, payload }` 또는 필드 오류를 반환한다. 원문을 정규화하지 않으며, URL 파서가 묵시적으로 보정하는 공백·제어 문자·역슬래시·과도한 슬래시는 오류로 처리한다.

`frontend/src/qr/generate.ts`의 `generateQr(payload)`은 `{ ok: true, matrix, svg, quietZone: 4 }` 또는 생성 오류를 반환한다. 검정 모듈과 불투명 흰 배경을 사용하며, 페이로드를 SVG 마크업에 넣지 않는다. QR 라이브러리의 오류 정정 수준은 M이다. 생성 오류의 message는 모듈의 기본 설명이며, 시안에 없는 최종 UI 문구는 아직 확정하지 않았다.

```ts
import { validateUrl } from './frontend/src/qr/url.js';
import { generateQr } from './frontend/src/qr/generate.js';

const input = validateUrl('https://example.com');
if (input.ok) {
  const qr = generateQr(input.payload);
  if (qr.ok) {
    // 다음 UI 단계에서 qr.svg를 미리보기에 사용한다.
    // 저장/다운로드는 인증 및 저장 구현 이후에 연결한다.
  }
}
```

테스트에서는 실제 생성 SVG를 sharp로 렌더링하고 독립 라이브러리 jsQR로 읽어 원문과 비교한다. 이는 자동 디코딩 검사이며 Android·iOS 카메라의 실제 스캔 검증은 아직 하지 않았다.

라이브러리 API 참고: [node-qrcode](https://github.com/soldair/node-qrcode), [jsQR](https://github.com/cozmo/jsQR).
