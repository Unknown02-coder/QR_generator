import { test, expect, type Page } from '@playwright/test';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const jsQR = createRequire(import.meta.url)('jsqr') as typeof import('jsqr').default;
async function decode(page: Page, format: 'PNG' | 'SVG', expected: string) {
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: format === 'PNG' ? 'PNG 이미지' : 'SVG 벡터', exact: false }).click();
  const download = await event;
  expect(download.suggestedFilename()).toMatch(new RegExp(`^qr-(url|wifi|contact|text|email)\\.${format.toLowerCase()}$`));
  const file = await download.path();
  expect(file).not.toBeNull();
  const bytes = await readFile(file!);
  const image = sharp(bytes);
  if (format === 'PNG') {
    const metadata = await image.metadata();
    expect([metadata.width, metadata.height]).toEqual([1024, 1024]);
  } else image.resize(1024, 1024, { kernel: 'nearest' });
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height);
  expect(decoded?.data).toBe(expected);
  for (let x = 0; x < info.width; x++) {
    expect([...data.subarray(x * 4, x * 4 + 4)]).toEqual([255, 255, 255, 255]);
  }
}

test('all five types download actual PNG and SVG without account requests or persistence', async ({ page }) => {
  const accountRequests: string[] = [];
  page.on('request', request => { if (/\/(api|oauth2|login\/oauth2)\//.test(request.url())) accountRequests.push(request.url()); });
  await page.goto('/');
  const cases = [
    { tab: '웹 주소', fields: { '웹 주소': 'https://example.com/행사?x=A%2Fb#일정' }, payload: 'https://example.com/행사?x=A%2Fb#일정' },
    { tab: '와이파이', fields: { '네트워크 이름': ' wifi;한글 ', '비밀번호': ' p;\\" ' }, payload: 'WIFI:T:WPA;S: wifi\\;한글 ;P: p\\;\\\\\\" ;;' },
    { tab: '연락처', fields: { '성': '김', '이름': '민지' }, payload: 'BEGIN:VCARD\r\nVERSION:3.0\r\nN:김;민지;;;\r\nFN:김 민지\r\nEND:VCARD\r\n' },
    { tab: '텍스트', fields: { '내용': '  첫 줄 🎉\n다음 줄  ' }, payload: '  첫 줄 🎉\n다음 줄  ' },
    { tab: '이메일', fields: { '받는 이메일': 'hello+qr@example.com', '제목': '문의 & #', '본문': '첫 줄\n다음 줄' }, payload: 'mailto:hello+qr@example.com?subject=%EB%AC%B8%EC%9D%98%20%26%20%23&body=%EC%B2%AB%20%EC%A4%84%0D%0A%EB%8B%A4%EC%9D%8C%20%EC%A4%84' },
  ];
  for (const c of cases) {
    await page.getByRole('tab', { name: c.tab, exact: true }).click();
    for (const [label, value] of Object.entries(c.fields)) await page.getByLabel(label, { exact: true }).and(page.locator('input, textarea')).fill(value);
    await page.screenshot({ path: `../.cache/web-${c.tab}.png`, fullPage: true });
    await page.getByRole('button', { name: 'QR 다운로드', exact: true }).click();
    if (c.tab === '웹 주소') await page.screenshot({ path: '../.cache/web-download.png', fullPage: true });
    await decode(page, 'PNG', c.payload);
    await decode(page, 'SVG', c.payload);
    await page.getByRole('button', { name: '닫기', exact: true }).click();
  }
  expect(accountRequests).toEqual([]);
  const storage = await page.evaluate(async () => ({ local: localStorage.length, session: sessionStorage.length, dbs: (await indexedDB.databases()).length }));
  expect(storage).toEqual({ local: 0, session: 0, dbs: 0 });
  await page.getByRole('tab', { name: '웹 주소', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '웹 주소', exact: true })).toHaveValue(cases[0]!.payload);
  await page.reload();
  await expect(page.getByRole('textbox', { name: '웹 주소', exact: true })).toHaveValue('');
});

test('Wi-Fi visibility resets on public network and type switching, retained password is omitted', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: '와이파이' }).click();
  await page.getByLabel('네트워크 이름', { exact: true }).fill('public');
  await page.getByLabel('비밀번호', { exact: true }).fill('secret');
  await page.getByRole('button', { name: '비밀번호 보기', exact: true }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByLabel('비밀번호', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('radio', { name: '공개 네트워크', exact: true }).check();
  await expect(page.getByLabel('비밀번호', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'QR 다운로드', exact: true }).click();
  await decode(page, 'SVG', 'WIFI:T:nopass;S:public;;');
  await page.keyboard.press('Escape');
  await page.getByRole('radio', { name: '비밀번호 사용', exact: true }).check();
  await expect(page.getByLabel('비밀번호', { exact: true })).toHaveValue('secret');
  await expect(page.getByLabel('비밀번호', { exact: true })).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: '비밀번호 보기', exact: true }).click();
  await page.getByRole('tab', { name: '텍스트', exact: true }).click();
  await page.getByRole('tab', { name: '와이파이', exact: true }).click();
  await expect(page.getByLabel('비밀번호', { exact: true })).toHaveAttribute('type', 'password');
});

test('invalid and oversize input remove stale QR and disabled actions recover', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: '웹 주소', exact: true }).fill('https://example.com');
  await expect(page.getByRole('img', { name: '웹 주소 QR 미리보기' })).toBeVisible();
  await page.getByRole('textbox', { name: '웹 주소', exact: true }).fill('example.com');
  await expect(page.getByRole('img')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'QR 다운로드', exact: true })).toBeDisabled();
  await page.getByRole('tab', { name: '텍스트', exact: true }).click();
  await page.getByLabel('내용', { exact: true }).fill('가'.repeat(1000));
  await expect(page.getByText('내용이 너무 길어요. 내용을 줄여 다시 시도해 주세요.').first()).toBeVisible();
  await expect(page.getByRole('img')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '다시 생성' })).toHaveCount(0);
  await page.getByLabel('내용', { exact: true }).fill('복구');
  await expect(page.getByRole('button', { name: 'QR 다운로드', exact: true })).toBeEnabled();
});

test('failed PNG preparation retains input and selected format, retry works and dialog returns focus', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: '웹 주소', exact: true }).fill('https://example.com');
  await page.evaluate(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function(callback) {
      HTMLCanvasElement.prototype.toBlob = original;
      callback(null);
    };
  });
  await page.getByRole('button', { name: 'QR 다운로드', exact: true }).click();
  await page.getByRole('button', { name: /PNG 이미지/ }).click();
  await expect(page.getByRole('alert')).toHaveText('파일을 준비하지 못했어요. 잠시 후 다시 시도해 주세요.');
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: '다시 다운로드', exact: true }).click();
  expect((await event).suggestedFilename()).toBe('qr-url.png');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'QR 다운로드', exact: true })).toBeFocused();
  await expect(page.getByRole('textbox', { name: '웹 주소', exact: true })).toHaveValue('https://example.com');
});

test('login guide offers guest entry and retains original input', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: '웹 주소', exact: true }).fill('https://example.com');
  await page.getByRole('button', { name: '로그인하고 저장', exact: true }).click();
  await expect(page.getByRole('button', { name: 'GitHub로 계속하기', exact: true })).toBeDisabled();
  await page.screenshot({ path: '../.cache/web-login.png', fullPage: true });
  await page.getByRole('button', { name: '비로그인으로 사용하기', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '웹 주소', exact: true })).toHaveValue('https://example.com');
});

test('generation failure clears preview and can retry, tabs support keyboard navigation', async ({ page }) => {
  await page.route('**/src/qr/generate.ts', async route => {
    const response = await route.fetch();
    const body = await response.text();
    const call = /QRCode\.create\(payload, \{ errorCorrectionLevel: ["']M["'] \}\)/;
    expect(body).toMatch(call);
    const injected = 'let failOnce = true;\n' + body.replace(call, '(failOnce ? (() => { failOnce = false; throw new Error("test failure"); })() : $&)');
    await route.fulfill({ response, body: injected });
  });
  await page.goto('/');
  await page.getByRole('textbox', { name: '웹 주소', exact: true }).fill('https://example.com');
  await expect(page.getByText('QR을 만들지 못했어요. 내용을 확인하고 다시 시도해 주세요.')).toBeVisible();
  await expect(page.getByRole('img')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'QR 다운로드', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '다시 생성', exact: true }).click();
  await expect(page.getByRole('img', { name: '웹 주소 QR 미리보기' })).toBeVisible();
  await page.getByRole('tab', { name: '웹 주소', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: '와이파이', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: '와이파이', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('textbox', { name: '웹 주소', exact: true })).toHaveValue('https://example.com');
});
