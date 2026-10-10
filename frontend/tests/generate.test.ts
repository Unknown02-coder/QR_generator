import assert from 'node:assert/strict';
import { test, mock } from 'node:test';
import QRCode from 'qrcode';
import { createRequire } from 'node:module';
import sharp from 'sharp';
import { generateQr } from '../src/qr/generate.js';
import { validateUrl } from '../src/qr/url.js';

// jsQR's CJS runtime export is a function; its declarations expose an ES default.
const jsQR = createRequire(import.meta.url)('jsqr') as typeof import('jsqr').default;

function requireQr(payload: string) {
  const qr = generateQr(payload);
  if (!qr.ok) assert.fail(qr.message);
  return qr;
}

async function rasterize(svg: string, size: number) {
  return sharp(Buffer.from(svg)).resize(size, size).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

for (const payload of [
  'https://example.com',
  'HTTPS://EXAMPLE.COM/Path?key=A%2FB&value=one+two#Section',
  'https://예시.한국/행사?제목=안녕하세요#일정',
  'https://example.com/🎉?title=일정',
  'https://example.com/?next=<script>alert("x")</script>&q=한글',
]) {
  test(`generated SVG independently decodes to the original URL: ${payload}`, async () => {
    const validated = validateUrl(payload);
    if (!validated.ok) assert.fail(validated.message);
    const qr = requireQr(validated.payload);
    const { data, info } = await rasterize(qr.svg, (qr.matrix.size + 8) * 8);
    const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height);
    assert.ok(decoded, 'independent decoder could not read the rasterized SVG');
    assert.equal(decoded.data, payload);
    assert.equal(qr.svg.includes(payload), false, 'payload text must not be embedded as SVG markup');
    assert.equal(qr.svg.includes('<script>'), false);
  });
}

test('SVG has opaque black/white pixels and four completely blank modules on each side', async () => {
  const qr = requireQr('https://example.com');
  assert.equal(qr.quietZone, 4);
  assert.equal(qr.matrix.data.length, qr.matrix.size ** 2);
  const scale = 8;
  const extent = qr.matrix.size + 8;
  const { data, info } = await rasterize(qr.svg, extent * scale);
  assert.equal(info.channels, 4);
  assert.equal(info.width, extent * scale);
  assert.equal(info.height, extent * scale);

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const moduleX = Math.floor(x / scale) - 4;
      const moduleY = Math.floor(y / scale) - 4;
      const inCode = moduleX >= 0 && moduleY >= 0 && moduleX < qr.matrix.size && moduleY < qr.matrix.size;
      const dark = inCode && qr.matrix.data[moduleY * qr.matrix.size + moduleX] === 1;
      const color = dark ? 0 : 255;
      const pixel = (y * info.width + x) * 4;
      assert.equal(data[pixel], color, `red pixel at ${x},${y}`);
      assert.equal(data[pixel + 1], color);
      assert.equal(data[pixel + 2], color);
      assert.equal(data[pixel + 3], 255);
    }
  }
});

test('the shared generator preserves whitespace for future text payloads', async () => {
  const payload = '  행사 일정\n다음 주 화요일  ';
  const qr = requireQr(payload);
  const { data, info } = await rasterize(qr.svg, (qr.matrix.size + 8) * 8);
  const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height);
  assert.ok(decoded);
  assert.equal(decoded.data, payload);
});

test('empty payload fails without SVG or matrix', () => {
  const result = generateQr('');
  assert.equal(result.ok, false);
  if (result.ok) assert.fail('empty payload generated a QR');
  assert.equal(result.code, 'empty');
  assert.equal('svg' in result, false);
  assert.equal('matrix' in result, false);
});

for (const payload of ['a'.repeat(2500), '가'.repeat(1000), 'a'.repeat(10000)]) {
  test(`capacity failure is returned without a stale QR (${payload.length} characters)`, () => {
    const result = generateQr(payload);
    assert.equal(result.ok, false);
    if (result.ok) assert.fail('oversize payload generated a QR');
    assert.equal(result.code, 'capacity');
    assert.equal('svg' in result, false);
    assert.equal('matrix' in result, false);
  });
}

test('large alphanumeric content uses the library capacity instead of an arbitrary byte limit', async () => {
  const payload = 'A'.repeat(3000);
  const qr = requireQr(payload);
  const { data, info } = await rasterize(qr.svg, (qr.matrix.size + 8) * 6);
  const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height);
  assert.ok(decoded);
  assert.equal(decoded.data, payload);
});

test('success, capacity failure and a different success have independent results', async () => {
  const first = requireQr('https://example.com/first');
  assert.equal(generateQr('a'.repeat(10000)).ok, false);
  const secondPayload = 'https://example.com/second';
  const second = requireQr(secondPayload);
  assert.notEqual(first.svg, second.svg);
  assert.notEqual(first.matrix.data, second.matrix.data);
  const { data, info } = await rasterize(second.svg, (second.matrix.size + 8) * 8);
  const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height);
  assert.ok(decoded);
  assert.equal(decoded.data, secondPayload);
});

test('unexpected generation failure has a safe recoverable message without a stale QR', () => {
  const mocked = mock.method(QRCode, 'create', () => { throw new Error('private internal failure'); });
  try {
    const result = generateQr('valid input');
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, 'generation');
      assert.equal(result.message, 'QR을 만들지 못했어요. 내용을 확인하고 다시 시도해 주세요.');
      assert.equal('svg' in result, false);
    }
  } finally { mocked.mock.restore(); }
});
