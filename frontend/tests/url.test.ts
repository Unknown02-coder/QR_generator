import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateUrl } from '../src/qr/url.js';

for (const input of [
  'https://example.com',
  'http://example.com:8080/event',
  'HTTPS://EXAMPLE.COM/Path?key=A%2FB&value=one+two#Section',
  'https://예시.한국/행사?제목=안녕하세요#일정',
  'https://example.com/🎉?title=일정',
  'https://example.com/search?q=%3Cscript%3E&empty=',
]) {
  test(`valid URL is preserved exactly: ${input}`, () => {
    assert.deepEqual(validateUrl(input), { ok: true, payload: input });
  });
}

for (const input of ['', ' ', '\t\r\n']) {
  test(`empty URL has a required-field error: ${JSON.stringify(input)}`, () => {
    assert.deepEqual(validateUrl(input), {
      ok: false,
      code: 'required',
      message: '웹 주소를 입력해 주세요.',
    });
  });
}

for (const input of ['example.com', 'ftp://example.com', 'javascript:alert(1)', 'https:example.com', '//example.com']) {
  test(`unsupported/missing protocol is rejected: ${input}`, () => {
    assert.deepEqual(validateUrl(input), {
      ok: false,
      code: 'protocol',
      message: '주소 앞에 http:// 또는 https://를 포함해 주세요.',
    });
  });
}

for (const input of [
  'https://',
  'https:///example.com',
  'https://example.com:99999',
  'https://exa mple.com',
  ' https://example.com',
  'https://example.com ',
  'https://example.com/path\nnext',
  'https://example.com/\u0000',
  'https://example.com/\\next',
  'https://example.com/\ud800',
  'https://example.com/\udc00',
]) {
  test(`invalid URL is rejected without normalization: ${JSON.stringify(input)}`, () => {
    const result = validateUrl(input);
    assert.equal(result.ok, false);
    if (result.ok) assert.fail('invalid input produced a payload');
    assert.equal(result.code, 'invalid');
    assert.equal(result.message, '올바른 웹 주소를 입력해 주세요.');
    assert.equal('payload' in result, false);
  });
}

test('a valid URL followed by an invalid one cannot return the previous payload', () => {
  assert.equal(validateUrl('https://example.com').ok, true);
  const result = validateUrl('example.com');
  assert.equal(result.ok, false);
  assert.equal('payload' in result, false);
});
