export type UrlPayloadResult =
  | { ok: true; payload: string }
  | { ok: false; code: 'required' | 'protocol' | 'invalid'; message: string };

export function createUrlPayload(value: string): UrlPayloadResult {
  if (value.trim() === '') {
    return { ok: false, code: 'required', message: '웹 주소를 입력해 주세요.' };
  }

  if (!/^https?:\/\//i.test(value)) {
    return {
      ok: false,
      code: 'protocol',
      message: '주소 앞에 http:// 또는 https://를 포함해 주세요.',
    };
  }

  try {
    const url = new URL(value);
    const authority = value.match(/^https?:\/\/([^/?#]+)/i)?.[1];

    if (!authority || !url.hostname || /\s/u.test(value)) {
      throw new TypeError('Invalid web address');
    }
  } catch {
    return { ok: false, code: 'invalid', message: '올바른 웹 주소를 입력해 주세요.' };
  }

  return { ok: true, payload: value };
}
