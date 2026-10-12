import { createContactPayload, type ContactInput } from './contactPayload.ts';
import { createEmailPayload, type EmailInput } from './emailPayload.ts';
import { createTextPayload } from './textPayload.ts';
import { createUrlPayload } from './urlPayload.ts';
import { createWifiPayload, type WifiInput } from './wifiPayload.ts';

export type QrType = 'url' | 'wifi' | 'contact' | 'text' | 'email';
export const qrTypes: { id: QrType; label: string }[] = [
  { id: 'url', label: '웹 주소' },
  { id: 'wifi', label: '와이파이' },
  { id: 'contact', label: '연락처' },
  { id: 'text', label: '텍스트' },
  { id: 'email', label: '이메일' },
];

export type FormValues = {
  url: string;
  wifi: WifiInput;
  contact: ContactInput;
  text: string;
  email: EmailInput;
};

export const initialFormValues: FormValues = {
  url: '',
  wifi: { ssid: '', security: 'password', password: '' },
  contact: { familyName: '', givenName: '', phone: '', email: '', organization: '', website: '' },
  text: '',
  email: { to: '', subject: '', body: '' },
};

export type PayloadOutcome = { ok: true; payload: string } | { ok: false; field: string; message: string };

export function createPayload(type: QrType, values: FormValues): PayloadOutcome {
  switch (type) {
    case 'url': {
      const result = createUrlPayload(values.url);
      return result.ok ? result : { ...result, field: 'url' };
    }
    case 'wifi': return createWifiPayload(values.wifi);
    case 'contact': return createContactPayload(values.contact);
    case 'text': return createTextPayload(values.text);
    case 'email': return createEmailPayload(values.email);
  }
}
