import { validateContactInput } from './contactPayload.ts';
import { validateEmailInput } from './emailPayload.ts';
import { createTextPayload } from './textPayload.ts';
import { createUrlPayload } from './urlPayload.ts';
import { validateWifiInput } from './wifiPayload.ts';
import type { FormValues, QrType } from './payload.ts';

export function getFormErrors(type: QrType, values: FormValues): Record<string, string> {
  switch (type) {
    case 'url': {
      const result = createUrlPayload(values.url);
      return result.ok ? {} : { url: result.message };
    }
    case 'wifi': return Object.fromEntries(validateWifiInput(values.wifi).map(error => [error.field, error.message]));
    case 'contact': return Object.fromEntries(validateContactInput(values.contact).map(error => [error.field, error.message]));
    case 'text': {
      const result = createTextPayload(values.text);
      return result.ok ? {} : { text: result.message };
    }
    case 'email': return Object.fromEntries(validateEmailInput(values.email).map(error => [error.field, error.message]));
  }
}
