import assert from 'node:assert/strict';
import test from 'node:test';
import { createContactPayload } from '../src/qr/contactPayload.ts';
import { createEmailPayload } from '../src/qr/emailPayload.ts';
import { createTextPayload } from '../src/qr/textPayload.ts';

const emptyContact = { familyName: '', givenName: '', phone: '', email: '', organization: '', website: '' };

test('contact keeps family and given names in vCard 3.0 fields', () => {
  const result = createContactPayload({ ...emptyContact, familyName: ' 김 ', givenName: ' 민지 ' });
  assert.equal(result.ok, true);
  assert.match(result.payload, /N:김;민지;;;\r\nFN:김 민지/);
  assert.match(result.payload, /^BEGIN:VCARD\r\nVERSION:3\.0\r\n/);
});

test('contact accepts one name but rejects both names missing', () => {
  assert.equal(createContactPayload({ ...emptyContact, givenName: '민지' }).ok, true);
  assert.deepEqual(createContactPayload(emptyContact), { ok: false, field: 'name', message: '성 또는 이름을 입력해 주세요.' });
});

test('contact escapes punctuation and folds long UTF-8 lines', () => {
  const result = createContactPayload({ ...emptyContact, givenName: '가'.repeat(40), organization: 'A;B,C\\D' });
  assert.equal(result.ok, true);
  assert.match(result.payload, /ORG:A\\;B\\,C\\\\D/);
  for (const line of result.payload.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75);
});

test('email encodes optional subject and body into mailto URI', () => {
  assert.deepEqual(createEmailPayload({ to: ' me@example.com ', subject: '문의 사항', body: '안녕하세요\n문의합니다' }), {
    ok: true,
    payload: 'mailto:me@example.com?subject=%EB%AC%B8%EC%9D%98%20%EC%82%AC%ED%95%AD&body=%EC%95%88%EB%85%95%ED%95%98%EC%84%B8%EC%9A%94%0D%0A%EB%AC%B8%EC%9D%98%ED%95%A9%EB%8B%88%EB%8B%A4',
  });
  assert.equal(createEmailPayload({ to: 'wrong', subject: '', body: '' }).ok, false);
});

test('text preserves its content but rejects whitespace-only input', () => {
  assert.deepEqual(createTextPayload('  안내\n'), { ok: true, payload: '  안내\n' });
  assert.equal(createTextPayload('  \n ').ok, false);
});
