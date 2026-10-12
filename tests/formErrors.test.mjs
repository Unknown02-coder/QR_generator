import assert from 'node:assert/strict';
import test from 'node:test';
import { getFormErrors } from '../src/qr/formErrors.ts';
import { initialFormValues } from '../src/qr/payload.ts';

test('Wi-Fi reports both missing fields in one form state', () => {
  assert.deepEqual(getFormErrors('wifi', initialFormValues), {
    ssid: '네트워크 이름을 입력해 주세요.',
    password: '비밀번호를 입력해 주세요.',
  });
});

test('contact reports independent name, email, and website errors', () => {
  const values = {
    ...initialFormValues,
    contact: { ...initialFormValues.contact, email: 'invalid@', website: 'example.com' },
  };
  assert.deepEqual(getFormErrors('contact', values), {
    name: '성 또는 이름을 입력해 주세요.',
    email: '올바른 이메일 주소를 입력해 주세요.',
    website: '웹사이트 주소는 http:// 또는 https://로 시작해야 해요.',
  });
});

test('email reports recipient and subject errors together', () => {
  const values = { ...initialFormValues, email: { to: 'invalid@', subject: '첫 줄\n둘째 줄', body: '' } };
  assert.deepEqual(getFormErrors('email', values), {
    to: '올바른 이메일 주소를 입력해 주세요.',
    subject: '제목에는 줄바꿈을 사용할 수 없어요.',
  });
});
