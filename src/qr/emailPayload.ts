export type EmailInput = { to: string; subject: string; body: string };
export type EmailResult =
  | { ok: true; payload: string }
  | { ok: false; field: 'to' | 'subject'; message: string };
type EmailError = Extract<EmailResult, { ok: false }>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export function validateEmailInput({ to, subject }: EmailInput): EmailError[] {
  const errors: EmailError[] = [];
  const address = to.trim();
  if (!address) errors.push({ ok: false, field: 'to', message: '받는 이메일 주소를 입력해 주세요.' });
  else if (!emailPattern.test(address)) errors.push({ ok: false, field: 'to', message: '올바른 이메일 주소를 입력해 주세요.' });
  if (/[\r\n]/u.test(subject)) errors.push({ ok: false, field: 'subject', message: '제목에는 줄바꿈을 사용할 수 없어요.' });
  return errors;
}

export function createEmailPayload({ to, subject, body }: EmailInput): EmailResult {
  const error = validateEmailInput({ to, subject, body })[0];
  if (error) return error;
  const address = to.trim();
  const params: string[] = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body.replace(/\r\n|\r|\n/gu, '\r\n'))}`);
  const encodedAddress = encodeURIComponent(address).replace('%40', '@');
  return { ok: true, payload: `mailto:${encodedAddress}${params.length ? `?${params.join('&')}` : ''}` };
}
