export type WifiInput = {
  ssid: string;
  security: 'password' | 'open';
  password: string;
};

export type WifiPayloadResult =
  | { ok: true; payload: string }
  | { ok: false; field: 'ssid' | 'password'; code: 'required' | 'control'; message: string };
type WifiError = Extract<WifiPayloadResult, { ok: false }>;

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u;
const HEX_BYTES = /^(?:[0-9a-f]{2})+$/iu;

function encodeWifiValue(value: string, isPassword: boolean): string {
  const escaped = value.replace(/[\\;,:\"]/g, (character) => `\\${character}`);
  const looksLikeHexBytes = HEX_BYTES.test(value);
  return looksLikeHexBytes && !(isPassword && value.length === 64) ? `"${escaped}"` : escaped;
}

export function validateWifiInput({ ssid, security, password }: WifiInput): WifiError[] {
  const errors: WifiError[] = [];
  if (ssid === '') {
    errors.push({ ok: false, field: 'ssid', code: 'required', message: '네트워크 이름을 입력해 주세요.' });
  } else if (CONTROL_CHARACTERS.test(ssid)) {
    errors.push({ ok: false, field: 'ssid', code: 'control', message: '네트워크 이름에는 줄바꿈이나 제어 문자를 사용할 수 없어요.' });
  }
  if (security === 'password') {
    if (password === '') {
      errors.push({ ok: false, field: 'password', code: 'required', message: '비밀번호를 입력해 주세요.' });
    } else if (CONTROL_CHARACTERS.test(password)) {
      errors.push({ ok: false, field: 'password', code: 'control', message: '비밀번호에는 줄바꿈이나 제어 문자를 사용할 수 없어요.' });
    }
  }
  return errors;
}

export function createWifiPayload({ ssid, security, password }: WifiInput): WifiPayloadResult {
  const error = validateWifiInput({ ssid, security, password })[0];
  if (error) return error;
  const encodedSsid = encodeWifiValue(ssid, false);
  if (security === 'open') return { ok: true, payload: `WIFI:T:nopass;S:${encodedSsid};;` };
  return {
    ok: true,
    payload: `WIFI:T:WPA;S:${encodedSsid};P:${encodeWifiValue(password, true)};;`,
  };
}
