import { validateUrl } from './url.js';

export type QrType = 'URL' | 'WIFI' | 'CONTACT' | 'TEXT' | 'EMAIL';
export type QrInput =
  | { type: 'URL'; url: string }
  | { type: 'WIFI'; ssid: string; security: 'WPA' | 'nopass'; password: string }
  | { type: 'CONTACT'; familyName: string; givenName: string; phone: string; email: string; company: string; website: string }
  | { type: 'TEXT'; text: string }
  | { type: 'EMAIL'; recipient: string; subject: string; body: string };
export type PayloadResult = { ok: true; payload: string } | { ok: false; errors: Record<string, string> };

const malformedUnicode = /[\ud800-\udfff]/u;
const controls = /[\u0000-\u001f\u007f-\u009f]/u;
const emailPattern = /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/;
const emailError = '올바른 이메일 주소를 입력해 주세요.';

function wifiValue(value: string, password = false): string {
  const escaped = value.replace(/[\\;,":]/g, '\\$&');
  const hex = /^(?:[0-9a-fA-F]{2})+$/.test(value);
  return hex && !(password && value.length === 64) ? `"${escaped}"` : escaped;
}

function vcardText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
}

/** Fold at 75 UTF-8 octets, including the continuation space. */
function foldLine(value: string): string {
  const encoder = new TextEncoder();
  const lines: string[] = [];
  let current = '';
  let bytes = 0;
  for (const character of value) {
    const size = encoder.encode(character).length;
    if (bytes + size > 75) {
      lines.push(current);
      current = ' ';
      bytes = 1;
    }
    current += character;
    bytes += size;
  }
  lines.push(current);
  return lines.join('\r\n');
}

/** Pure input validation and conversion; no logging, persistence or network. */
export function buildPayload(input: QrInput): PayloadResult {
  const errors: Record<string, string> = {};
  for (const [field, value] of Object.entries(input)) {
    if (typeof value === 'string' && malformedUnicode.test(value)) errors[field] = '입력 내용을 확인해 주세요.';
  }
  let payload = '';
  switch (input.type) {
    case 'URL': {
      const result = validateUrl(input.url);
      if (result.ok) payload = result.payload;
      else errors.url = result.message;
      break;
    }
    case 'WIFI': {
      if (input.ssid === '') errors.ssid = '네트워크 이름을 입력해 주세요.';
      else if (controls.test(input.ssid)) errors.ssid = '네트워크 이름에는 줄바꿈이나 제어 문자를 넣을 수 없어요.';
      if (input.security !== 'WPA' && input.security !== 'nopass') errors.security = '보안 방식을 확인해 주세요.';
      if (input.security === 'WPA') {
        if (input.password === '') errors.password = '비밀번호를 입력해 주세요.';
        else if (controls.test(input.password)) errors.password = '비밀번호에는 줄바꿈이나 제어 문자를 넣을 수 없어요.';
      }
      // A public network ignores a password retained by the form in memory.
      if (input.security === 'nopass') delete errors.password;
      payload = `WIFI:T:${input.security};S:${wifiValue(input.ssid)};${input.security === 'WPA' ? `P:${wifiValue(input.password, true)};` : ''};`;
      break;
    }
    case 'CONTACT': {
      const familyName = input.familyName.trim();
      const givenName = input.givenName.trim();
      if (!familyName && !givenName) errors.familyName = '성과 이름 중 하나는 입력해 주세요.';
      if (input.phone && (controls.test(input.phone) || !/^[+0-9 ()*.#-]+$/.test(input.phone))) errors.phone = '올바른 전화번호를 입력해 주세요.';
      if (input.email && !emailPattern.test(input.email)) errors.email = emailError;
      if (input.website && !validateUrl(input.website).ok) errors.website = '웹사이트 주소는 http:// 또는 https://로 시작해야 해요.';
      for (const field of ['familyName', 'givenName', 'company'] as const) {
        if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(input[field])) errors[field] = '연락처 내용을 확인해 주세요.';
      }
      const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:${vcardText(familyName)};${vcardText(givenName)};;;`, `FN:${vcardText([familyName, givenName].filter(Boolean).join(' '))}`];
      if (input.phone) lines.push(`TEL:${input.phone}`);
      if (input.email) lines.push(`EMAIL:${vcardText(input.email)}`);
      if (input.company) lines.push(`ORG:${vcardText(input.company)}`);
      if (input.website) lines.push(`URL:${input.website}`);
      lines.push('END:VCARD');
      payload = lines.map(foldLine).join('\r\n') + '\r\n';
      break;
    }
    case 'TEXT': {
      if (!input.text.trim()) errors.text = '내용을 입력해 주세요.';
      payload = input.text;
      break;
    }
    case 'EMAIL': {
      if (!emailPattern.test(input.recipient)) errors.recipient = emailError;
      if (controls.test(input.subject)) errors.subject = '제목에는 줄바꿈이나 제어 문자를 넣을 수 없어요.';
      const query: string[] = [];
      // Avoid URIError from unpaired surrogates: return validation first.
      if (Object.keys(errors).length) break;
      if (input.subject) query.push(`subject=${encodeURIComponent(input.subject)}`);
      // RFC 6068 requires mail body line breaks encoded as CRLF.
      if (input.body) query.push(`body=${encodeURIComponent(input.body.replace(/\r\n|\r|\n/g, '\r\n'))}`);
      const recipient = encodeURIComponent(input.recipient).replace(/%40/g, '@').replace(/%2B/g, '+');
      payload = `mailto:${recipient}${query.length ? '?' + query.join('&') : ''}`;
      break;
    }
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, payload };
}
