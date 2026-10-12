import assert from 'node:assert/strict';
import test from 'node:test';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import sharp from 'sharp';
import { createPayload, initialFormValues } from '../src/qr/payload.ts';

const cases = [
  ['url', { url: 'https://example.com/event' }],
  ['wifi', { wifi: { ssid: 'OFFICE;WIFI', security: 'password', password: 'p@ss:word' } }],
  ['contact', { contact: { familyName: '김', givenName: '민지', phone: '010-1234-5678', email: 'minji@example.com', organization: '회사', website: 'https://example.com' } }],
  ['text', { text: '행사 안내\n오후 2시' }],
  ['email', { email: { to: 'help@example.com', subject: '문의', body: '안녕하세요' } }],
];

async function decode(bytes) {
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const result = jsQR(new Uint8ClampedArray(data), info.width, info.height);
  assert.ok(result, 'QR reader should recognize generated image');
  assert.deepEqual(Array.from(data.subarray(0, 4)), [255, 255, 255, 255], 'quiet zone starts white');
  return result.data;
}

for (const [type, input] of cases) {
  test(`${type} PNG and SVG decode to the validated payload`, async () => {
    const outcome = createPayload(type, { ...initialFormValues, ...input });
    assert.equal(outcome.ok, true);
    const options = { margin: 4, width: 1024, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#FFFFFF' } };
    const png = await sharp(await QRCode.toBuffer(outcome.payload, options))
      .resize(1024, 1024, { kernel: 'nearest' })
      .png()
      .toBuffer();
    const svg = await QRCode.toString(outcome.payload, { ...options, type: 'svg' });
    assert.equal((await sharp(png).metadata()).width, 1024);
    assert.equal(await decode(png), outcome.payload);
    assert.equal(await decode(Buffer.from(svg)), outcome.payload);
  });
}
