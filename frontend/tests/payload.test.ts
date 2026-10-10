import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildPayload, type QrInput } from '../src/qr/payload.js';

function payload(input: QrInput) {
  const result = buildPayload(input);
  if (!result.ok) assert.fail(JSON.stringify(result.errors));
  return result.payload;
}

test('Wi-Fi preserves spaces and escapes scanner separators', () => {
  assert.equal(payload({ type: 'WIFI', ssid: ' a;:,"\\ ', security: 'WPA', password: ' p;\\ ' }), 'WIFI:T:WPA;S: a\\;\\:\\,\\"\\\\ ;P: p\\;\\\\ ;;');
});
test('Wi-Fi hexadecimal text and PSK keys follow scanner quoting rules', () => {
  assert.equal(payload({ type: 'WIFI', ssid: 'AB12', security: 'WPA', password: '1234' }), 'WIFI:T:WPA;S:"AB12";P:"1234";;');
  assert.ok(payload({ type: 'WIFI', ssid: 'wifi', security: 'WPA', password: 'a'.repeat(64) }).includes(`P:${'a'.repeat(64)};;`));
});
test('public Wi-Fi omits any retained password', () => {
  assert.equal(payload({ type: 'WIFI', ssid: ' ', security: 'nopass', password: 'retained' }), 'WIFI:T:nopass;S: ;;');
});
test('Wi-Fi requires fields and rejects control characters and unsupported security', () => {
  for (const input of [
    { type: 'WIFI', ssid: '', security: 'WPA', password: '' },
    { type: 'WIFI', ssid: 'wifi\nnext', security: 'nopass', password: '' },
    { type: 'WIFI', ssid: 'wifi', security: 'WPA', password: '\u0000' },
    { type: 'WIFI', ssid: 'wifi', security: 'WEP', password: 'secret' },
  ]) assert.equal(buildPayload(input as QrInput).ok, false);
});
const contact = { type: 'CONTACT', familyName: ' 김 ', givenName: ' 민지 ', phone: '', email: '', company: '', website: '' } as const;
test('contact has separate N components, FN and CRLF lines', () => {
  assert.equal(payload(contact), 'BEGIN:VCARD\r\nVERSION:3.0\r\nN:김;민지;;;\r\nFN:김 민지\r\nEND:VCARD\r\n');
  assert.ok(payload({ ...contact, familyName: '' }).includes('N:;민지;;;\r\nFN:민지\r\n'));
  assert.equal(buildPayload({ ...contact, familyName: ' ', givenName: '' }).ok, false);
});
test('contact escapes text values and rejects URI/property injection', () => {
  const vcard = payload({ ...contact, company: 'a,b;c\\d\nEND:VCARD' });
  assert.ok(vcard.includes('ORG:a\\,b\\;c\\\\d\\nEND:VCARD\r\n'));
  assert.equal(buildPayload({ ...contact, phone: '123\r\nURL:evil' }).ok, false);
  assert.equal(buildPayload({ ...contact, email: 'bad' }).ok, false);
  assert.equal(buildPayload({ ...contact, website: 'example.com' }).ok, false);
});
test('vCard folds long UTF-8 lines without breaking characters', () => {
  const name = '김🎉'.repeat(60);
  const vcard = payload({ ...contact, familyName: name, givenName: '' });
  for (const line of vcard.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75);
  assert.ok(vcard.replace(/\r\n /g, '').includes(`FN:${name}\r\n`));
  assert.equal(vcard.includes('\ufffd'), false);
});
test('text preserves whitespace but rejects blank-only and invalid Unicode', () => {
  assert.equal(payload({ type: 'TEXT', text: '  행사\n다음 줄  ' }), '  행사\n다음 줄  ');
  assert.equal(buildPayload({ type: 'TEXT', text: '\n  ' }).ok, false);
  assert.equal(buildPayload({ type: 'TEXT', text: '\ud800' }).ok, false);
});
test('email encodes subject/body separators and line breaks', () => {
  assert.equal(payload({ type: 'EMAIL', recipient: 'hello+qr@example.com', subject: '안내 & ?#', body: '첫 줄\n다음 줄' }), 'mailto:hello+qr@example.com?subject=%EC%95%88%EB%82%B4%20%26%20%3F%23&body=%EC%B2%AB%20%EC%A4%84%0D%0A%EB%8B%A4%EC%9D%8C%20%EC%A4%84');
  assert.equal(payload({ type: 'EMAIL', recipient: 'hello@example.com', subject: '', body: 'a\r\nb\rc\nd' }), 'mailto:hello@example.com?body=a%0D%0Ab%0D%0Ac%0D%0Ad');
  assert.equal(payload({ type: 'EMAIL', recipient: 'hello@example.com', subject: '', body: '' }), 'mailto:hello@example.com');
  assert.equal(buildPayload({ type: 'EMAIL', recipient: 'a@b.com\r\nBcc:other@b.com', subject: '', body: '' }).ok, false);
  assert.equal(buildPayload({ type: 'EMAIL', recipient: 'hello@example.com', subject: 'x\nBcc:other@b.com', body: '' }).ok, false);
});
test('URL dispatch preserves the original URL and reports the field', () => {
  assert.equal(payload({ type: 'URL', url: 'HTTPS://EXAMPLE.COM/x?y=A%2Fb#z' }), 'HTTPS://EXAMPLE.COM/x?y=A%2Fb#z');
  const result = buildPayload({ type: 'URL', url: 'example.com' });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.url);
});

test('email rejects invalid dot atoms', () => {
  for (const recipient of ['.name@example.com', 'name.@example.com', 'na..me@example.com']) {
    assert.equal(buildPayload({ type: 'EMAIL', recipient, subject: '', body: '' }).ok, false);
  }
});
test('contact errors identify the actual name field', () => {
  const result = buildPayload({ ...contact, familyName: '김\u0000' });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.familyName);
    assert.equal(result.errors.company, undefined);
  }
});
