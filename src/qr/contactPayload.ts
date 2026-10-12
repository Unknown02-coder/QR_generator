import { createUrlPayload } from './urlPayload.ts';

export type ContactInput = {
  familyName: string;
  givenName: string;
  phone: string;
  email: string;
  organization: string;
  website: string;
};

export type ContactResult =
  | { ok: true; payload: string }
  | { ok: false; field: keyof ContactInput | 'name'; message: string };
type ContactError = Extract<ContactResult, { ok: false }>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

function escapeVcard(value: string): string {
  return value.replace(/\\/gu, '\\\\').replace(/\r\n|\r|\n/gu, '\\n').replace(/;/gu, '\\;').replace(/,/gu, '\\,');
}

function foldLine(line: string): string {
  const encoder = new TextEncoder();
  let output = '';
  let length = 0;
  for (const character of line) {
    const bytes = encoder.encode(character).length;
    if (length + bytes > 75) {
      output += '\r\n ';
      length = 1;
    }
    output += character;
    length += bytes;
  }
  return output;
}

export function validateContactInput(input: ContactInput): ContactError[] {
  const errors: ContactError[] = [];
  const family = input.familyName.trim();
  const given = input.givenName.trim();
  if (!family && !given) errors.push({ ok: false, field: 'name', message: '성 또는 이름을 입력해 주세요.' });
  if (input.email.trim() && !emailPattern.test(input.email.trim())) {
    errors.push({ ok: false, field: 'email', message: '올바른 이메일 주소를 입력해 주세요.' });
  }
  if (input.website.trim() && !createUrlPayload(input.website.trim()).ok) {
    errors.push({ ok: false, field: 'website', message: '웹사이트 주소는 http:// 또는 https://로 시작해야 해요.' });
  }
  return errors;
}

export function createContactPayload(input: ContactInput): ContactResult {
  const error = validateContactInput(input)[0];
  if (error) return error;
  const family = input.familyName.trim();
  const given = input.givenName.trim();
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escapeVcard(family)};${escapeVcard(given)};;;`,
    `FN:${escapeVcard([family, given].filter(Boolean).join(' '))}`,
  ];
  if (input.phone.trim()) lines.push(`TEL:${escapeVcard(input.phone.trim())}`);
  if (input.email.trim()) lines.push(`EMAIL:${escapeVcard(input.email.trim())}`);
  if (input.organization.trim()) lines.push(`ORG:${escapeVcard(input.organization.trim())}`);
  if (input.website.trim()) lines.push(`URL:${input.website.trim()}`);
  lines.push('END:VCARD');
  return { ok: true, payload: lines.map(foldLine).join('\r\n') };
}
