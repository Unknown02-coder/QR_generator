import assert from 'node:assert/strict';
import test from 'node:test';

import { createUrlPayload } from '../src/qr/urlPayload.ts';

test('HTTP and HTTPS addresses become unchanged QR payloads', () => {
  for (const address of [
    'https://example.com/path?name=%EA%B9%80&count=2#details',
    'http://localhost:8080/qr',
  ]) {
    assert.deepEqual(createUrlPayload(address), {
      ok: true,
      payload: address,
    });
  }
});

test('an empty address asks for a web address', () => {
  for (const address of ['', '   ']) {
    assert.deepEqual(createUrlPayload(address), {
      ok: false,
      code: 'required',
      message: '웹 주소를 입력해 주세요.',
    });
  }
});

test('missing and unsupported protocols explain the HTTP(S) requirement', () => {
  for (const address of ['example.com', 'ftp://example.com', 'mailto:a@example.com']) {
    assert.deepEqual(createUrlPayload(address), {
      ok: false,
      code: 'protocol',
      message: '주소 앞에 http:// 또는 https://를 포함해 주세요.',
    });
  }
});

test('malformed HTTP(S) addresses report an invalid address', () => {
  for (const address of ['https://', 'http:///missing-host', 'https://exa mple.com']) {
    assert.deepEqual(createUrlPayload(address), {
      ok: false,
      code: 'invalid',
      message: '올바른 웹 주소를 입력해 주세요.',
    });
  }
});
