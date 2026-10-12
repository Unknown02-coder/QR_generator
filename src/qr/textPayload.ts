export type TextResult =
  | { ok: true; payload: string }
  | { ok: false; field: 'text'; message: string };

export function createTextPayload(value: string): TextResult {
  return value.trim()
    ? { ok: true, payload: value }
    : { ok: false, field: 'text', message: 'QR에 담을 내용을 입력해 주세요.' };
}
