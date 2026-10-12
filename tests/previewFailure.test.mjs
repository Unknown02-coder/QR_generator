import assert from 'node:assert/strict';
import test from 'node:test';
import QRCode from 'qrcode';
import { classifyPreviewFailure } from '../src/qr/previewFailure.ts';

test('over-capacity QR input asks the user to shorten the content', async () => {
  let failure;
  try {
    await QRCode.toDataURL('가'.repeat(4000), { errorCorrectionLevel: 'M' });
  } catch (error) {
    failure = error;
  }
  assert.ok(failure);
  assert.equal(classifyPreviewFailure(failure), 'capacity');
});

test('unexpected generator errors offer a retry', () => {
  assert.equal(classifyPreviewFailure(new Error('render failed')), 'generation');
});
