import { buildPayload, type QrInput } from '../qr/payload.js';
import { generateQr } from '../qr/generate.js';
import type { SavedQrItem, SaveTarget } from '../account/types.js';

/** Demonstration data only. Never imported by the application entry point. */
export type ExampleQr = { metadata: SavedQrItem; source: SaveTarget };
export function makeExample(id: string, title: string, source: SaveTarget, createdAt: string, summary: string): ExampleQr {
  const qr = generateQr(source.payload);
  if (!qr.ok) throw new Error('예시 QR 생성 실패');
  return { source, metadata: { id, type: source.type, title, createdAt, summary, previewUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr.svg)}` } };
}
function inputSource(input: QrInput): SaveTarget {
  const result = buildPayload(input);
  if (!result.ok) throw new Error('예시 입력 오류');
  return { type: input.type, payload: result.payload };
}
export const examples: ExampleQr[] = [
  makeExample('00000000-0000-4000-8000-000000000001', '행사 안내', inputSource({ type: 'URL', url: 'https://example.com/event' }), '2026-10-10T00:00:00Z', 'example.com'),
  makeExample('00000000-0000-4000-8000-000000000002', '사무실 와이파이', inputSource({ type: 'WIFI', ssid: 'OFFICE_WIFI', security: 'WPA', password: 'WIFI_PRIVATE_PASSWORD' }), '2026-10-08T00:00:00Z', '네트워크 이름: OFFICE_WIFI'),
  makeExample('00000000-0000-4000-8000-000000000003', '김 민지', inputSource({ type: 'CONTACT', familyName: '김', givenName: '민지', phone: '', email: 'CONTACT_PRIVATE_EMAIL@example.com', company: '', website: '' }), '2026-10-05T00:00:00Z', '연락처 정보'),
];
