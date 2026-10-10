export type UrlValidation =
  | { ok: true; payload: string }
  | { ok: false; code: 'required' | 'protocol' | 'invalid'; message: string };

/** Validate syntax without normalizing the content embedded in the QR. */
export function validateUrl(input: string): UrlValidation {
  if (input.trim().length === 0) {
    return { ok: false, code: 'required', message: '웹 주소를 입력해 주세요.' };
  }

  const invalid = { ok: false, code: 'invalid', message: '올바른 웹 주소를 입력해 주세요.' } as const;
  // In Unicode mode, this surrogate range matches only unpaired code units;
  // valid pairs (including emoji) are matched as their complete code points.
  if (/[\s\u0000-\u001f\u007f-\u009f\ud800-\udfff\\]/u.test(input)) return invalid;

  if (!/^https?:\/\//i.test(input)) {
    return {
      ok: false,
      code: 'protocol',
      message: '주소 앞에 http:// 또는 https://를 포함해 주세요.',
    };
  }

  // WHATWG URL accepts and repairs whitespace, backslashes, and extra slashes.
  // Reject those repairs so a successful QR always represents the exact input.
  if (!/^https?:\/\/[^/?#]+/i.test(input)) {
    return invalid;
  }

  try {
    const parsed = new URL(input);
    if (!parsed.hostname) return invalid;
  } catch {
    return invalid;
  }

  return { ok: true, payload: input };
}
