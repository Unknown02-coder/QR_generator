import assert from 'node:assert/strict';
import test from 'node:test';

import { createWifiPayload } from '../src/qr/wifiPayload.ts';

test('password-protected and open networks use the expected QR format', () => {
  assert.deepEqual(createWifiPayload({ ssid: 'Cafe Wi-Fi', security: 'password', password: 'secret' }), {
    ok: true,
    payload: 'WIFI:T:WPA;S:Cafe Wi-Fi;P:secret;;',
  });
  assert.deepEqual(createWifiPayload({ ssid: 'Guest', security: 'open', password: 'previous value' }), {
    ok: true,
    payload: 'WIFI:T:nopass;S:Guest;;',
  });
});

test('SSID and password keep whitespace and escape Wi-Fi control punctuation', () => {
  assert.deepEqual(
    createWifiPayload({ ssid: ' A;B,C:D"E\\F ', security: 'password', password: ' p;,:"\\q ' }),
    {
      ok: true,
      payload: 'WIFI:T:WPA;S: A\\;B\\,C\\:D\\"E\\\\F ;P: p\\;\\,\\:\\"\\\\q ;;',
    },
  );
  assert.deepEqual(createWifiPayload({ ssid: '  ', security: 'open', password: '' }), {
    ok: true,
    payload: 'WIFI:T:nopass;S:  ;;',
  });
});

test('hex-looking text is quoted except a 64-digit raw password key', () => {
  assert.deepEqual(createWifiPayload({ ssid: 'ABCD', security: 'password', password: '1234' }), {
    ok: true,
    payload: 'WIFI:T:WPA;S:"ABCD";P:"1234";;',
  });
  assert.deepEqual(createWifiPayload({ ssid: 'ABC', security: 'password', password: 'A'.repeat(64) }), {
    ok: true,
    payload: `WIFI:T:WPA;S:ABC;P:${'A'.repeat(64)};;`,
  });
});

test('missing required values point to the relevant field', () => {
  assert.deepEqual(createWifiPayload({ ssid: '', security: 'open', password: '' }), {
    ok: false,
    field: 'ssid',
    code: 'required',
    message: '네트워크 이름을 입력해 주세요.',
  });
  assert.deepEqual(createWifiPayload({ ssid: 'Cafe', security: 'password', password: '' }), {
    ok: false,
    field: 'password',
    code: 'required',
    message: '비밀번호를 입력해 주세요.',
  });
});

test('line breaks and control characters are rejected for both fields', () => {
  assert.deepEqual(createWifiPayload({ ssid: 'Cafe\nGuest', security: 'open', password: '' }), {
    ok: false,
    field: 'ssid',
    code: 'control',
    message: '네트워크 이름에는 줄바꿈이나 제어 문자를 사용할 수 없어요.',
  });
  assert.deepEqual(createWifiPayload({ ssid: 'Cafe', security: 'password', password: 'pass\u0000word' }), {
    ok: false,
    field: 'password',
    code: 'control',
    message: '비밀번호에는 줄바꿈이나 제어 문자를 사용할 수 없어요.',
  });
});
