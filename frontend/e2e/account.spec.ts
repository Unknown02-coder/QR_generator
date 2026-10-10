import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import sharp from 'sharp';

const jsQR = createRequire(import.meta.url)('jsqr') as typeof import('jsqr').default;

test('account publishing list filters and shows safe summaries, empty state opens generator', async ({ page }) => {
  const apiRequests: string[] = [];
  page.on('request', r => { if (/\/(api|oauth2|login\/oauth2)\//.test(r.url())) apiRequests.push(r.url()); });
  await page.goto('/publishing.html?screen=list');
  await expect(page.getByText('예시 데이터 · 실제 로그인·계정 저장은 연결 전입니다.')).toBeVisible();
  await expect(page.getByRole('heading', { name: '저장한 QR 3개' })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(3);
  await expect(page.getByRole('article', { name: '행사 안내' }).getByText('example.com', { exact: true })).toBeVisible();
  await expect(page.getByText('CONTACT_PRIVATE_EMAIL')).toHaveCount(0);
  await expect(page.getByText('WIFI_PRIVATE_PASSWORD')).toHaveCount(0);
  await page.getByRole('button', { name: '와이파이', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: '사무실 와이파이' })).toBeVisible();
  await page.getByRole('button', { name: '텍스트', exact: true }).click();
  await expect(page.getByRole('heading', { name: '아직 저장한 텍스트 QR이 없어요' })).toBeVisible();
  await page.getByLabel('확인할 화면').selectOption('empty');
  await expect(page.getByRole('heading', { name: '아직 저장한 QR이 없어요', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '첫 QR 만들기' }).click();
  await expect(page.getByRole('button', { name: 'QR 저장하기', exact: true })).toBeVisible();
  expect(apiRequests).toEqual([]);
});

test('save validation, failed submission and retry retain title with one request key', async ({ page }) => {
  await page.addInitScript(() => {
    const original = crypto.randomUUID.bind(crypto);
    Object.assign(window, { saveKeyCount: 0 });
    crypto.randomUUID = () => { (window as Window & { saveKeyCount: number }).saveKeyCount++; return original(); };
  });
  await page.goto('/publishing.html?screen=save-error');
  const dialog = page.getByRole('dialog', { name: 'QR 저장하기' });
  await dialog.getByLabel('QR 이름', { exact: true }).fill('');
  await dialog.getByRole('button', { name: '저장하기', exact: true }).click();
  await expect(dialog.getByText('QR 이름을 입력해 주세요.')).toBeVisible();
  await dialog.getByLabel('QR 이름', { exact: true }).fill('나의 행사');
  await dialog.getByRole('button', { name: '저장하기', exact: true }).dblclick();
  await expect(dialog.getByRole('alert')).toContainText('QR을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
  await expect(dialog.getByLabel('QR 이름', { exact: true })).toHaveValue('나의 행사');
  expect(await page.evaluate(() => (window as Window & { saveKeyCount: number }).saveKeyCount)).toBe(1);
  await dialog.getByRole('button', { name: '다시 저장', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '나의 행사', exact: true })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(4);
  expect(await page.evaluate(() => (window as Window & { saveKeyCount: number }).saveKeyCount)).toBe(1);
});

test('delete cancel returns focus and confirmation removes only target sample', async ({ page }) => {
  await page.goto('/publishing.html?screen=list');
  const item = page.getByRole('article', { name: '행사 안내' });
  await item.getByRole('button', { name: 'QR 삭제', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '이 QR을 삭제할까요?' });
  await expect(dialog.getByText('‘행사 안내’가 내 QR 목록에서 사라져요.')).toBeVisible();
  await dialog.getByRole('button', { name: '취소' }).click();
  await expect(item.getByRole('button', { name: 'QR 삭제', exact: true })).toBeFocused();
  await expect(page.getByRole('article')).toHaveCount(3);
  await item.getByRole('button', { name: 'QR 삭제', exact: true }).click();
  await dialog.getByRole('button', { name: 'QR 삭제', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('article')).toHaveCount(2);
  await expect(page.getByRole('article', { name: '사무실 와이파이' })).toBeVisible();
  await expect(page.getByRole('button', { name: '+ 새 QR 만들기' })).toBeFocused();
});

test('saved download retries same format and decodes stored payload, unavailable stops retry', async ({ page }) => {
  await page.goto('/publishing.html?screen=download-error');
  const dialog = page.getByRole('dialog', { name: 'QR 다운로드' });
  await expect(dialog.getByText('‘행사 안내’를 어떤 파일로 받을까요?')).toBeVisible();
  await expect(dialog.getByText('계정에 보관하지 않아요. QR은 여러 번 스캔할 수 있어요.')).toHaveCount(0);
  await dialog.getByRole('button', { name: /PNG 이미지/ }).click();
  await expect(dialog.getByRole('alert')).toHaveText('파일을 준비하지 못했어요. 잠시 후 다시 시도해 주세요.');
  const event = page.waitForEvent('download');
  await dialog.getByRole('button', { name: '다시 다운로드', exact: true }).click();
  const file = await (await event).path();
  const { data, info } = await sharp(await readFile(file!)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  expect(jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data).toBe('https://example.com/event');
  await page.keyboard.press('Escape');
  await page.getByLabel('확인할 화면').selectOption('unavailable');
  await dialog.getByRole('button', { name: /SVG 벡터/ }).click();
  await expect(dialog.getByRole('alert')).toHaveText('이 QR을 다운로드할 수 없어요. 내 QR 목록을 새로고침해 주세요.');
  await expect(dialog.getByRole('button', { name: '다시 다운로드' })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: /PNG 이미지/ })).toBeDisabled();
  await dialog.getByRole('button', { name: '목록 새로고침' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('article')).toHaveCount(3);
});

test('login failure and auth expiry recover without losing generator input or draft title', async ({ page }) => {
  await page.addInitScript(() => {
    const original = crypto.randomUUID.bind(crypto);
    Object.assign(window, { saveKeyCount: 0 });
    crypto.randomUUID = () => { (window as Window & { saveKeyCount: number }).saveKeyCount++; return original(); };
  });
  await page.goto('/publishing.html?screen=login-error');
  await expect(page.getByRole('alert')).toContainText('GitHub 로그인을 완료하지 못했어요.');
  await page.getByRole('button', { name: '비로그인으로 사용하기', exact: true }).click();
  const input = page.getByRole('textbox', { name: '웹 주소', exact: true });
  await expect(input).toHaveValue('https://example.com');
  await input.fill('https://example.com/kept');
  await page.getByRole('button', { name: '로그인하고 저장', exact: true }).click();
  await page.getByRole('button', { name: 'GitHub로 계속하기', exact: true }).click();
  await expect(input).toHaveValue('https://example.com/kept');
  await expect(page.getByRole('dialog', { name: 'QR 저장하기' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByLabel('확인할 화면').selectOption('auth-expired');
  const save = page.getByRole('dialog', { name: 'QR 저장하기' });
  await save.getByLabel('QR 이름', { exact: true }).fill('유지할 이름');
  await save.getByRole('button', { name: '저장하기', exact: true }).click();
  await expect(save.getByRole('alert')).toHaveText('GitHub 로그인 후 다시 시도해 주세요.');
  await save.getByRole('button', { name: '로그인하고 다시 시도' }).click();
  await page.getByRole('button', { name: 'GitHub로 계속하기', exact: true }).click();
  await expect(save.getByLabel('QR 이름', { exact: true })).toHaveValue('유지할 이름');
  await save.getByRole('button', { name: '저장하기', exact: true }).click();
  await expect(save).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '유지할 이름', exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as Window & { saveKeyCount: number }).saveKeyCount)).toBe(1);
});

test('every publishing scene has no horizontal overflow or browser errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  for (const scene of ['list', 'empty', 'login', 'login-error', 'save', 'save-error', 'download', 'download-error', 'delete', 'delete-error', 'auth-expired', 'download-auth', 'unavailable', 'loading', 'list-error']) {
    await page.goto(`/publishing.html?screen=${scene}`);
    await expect(page.getByLabel('확인할 화면')).toHaveValue(scene);
    const dialog = page.getByRole('dialog');
    if (await dialog.count()) await expect(dialog).toBeVisible();
    if (scene === 'save-error' || scene === 'auth-expired') { await dialog.getByRole('button', { name: '저장하기', exact: true }).click(); await expect(dialog.getByRole('alert')).toBeVisible(); }
    if (['download-error', 'download-auth', 'unavailable'].includes(scene)) { await dialog.getByRole('button', { name: /PNG 이미지/ }).click(); await expect(dialog.getByRole('alert')).toBeVisible(); }
    if (scene === 'delete-error') { await dialog.getByRole('button', { name: 'QR 삭제', exact: true }).click(); await expect(dialog.getByRole('alert')).toBeVisible(); }
    await page.screenshot({ path: `../.cache/publishing-${scene}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('saved download keeps selected SVG after authentication recovery', async ({ page }) => {
  await page.goto('/publishing.html?screen=download-auth');
  const dialog = page.getByRole('dialog', { name: 'QR 다운로드' });
  await dialog.getByRole('button', { name: /SVG 벡터/ }).click();
  await expect(dialog.getByRole('alert')).toHaveText('GitHub 로그인 후 다시 시도해 주세요.');
  await dialog.getByRole('button', { name: '로그인하고 다시 시도' }).click();
  await page.getByRole('button', { name: 'GitHub로 계속하기', exact: true }).click();
  await expect(dialog.getByRole('button', { name: /SVG 벡터/ })).toHaveAttribute('aria-pressed', 'true');
  const event = page.waitForEvent('download');
  await dialog.getByRole('button', { name: /SVG 벡터/ }).click();
  expect((await event).suggestedFilename()).toBe('qr-url.svg');
});

test('save stays open while submitting, delete failure preserves rows, list error has refresh', async ({ page }) => {
  await page.goto('/publishing.html?screen=save');
  const save = page.getByRole('dialog', { name: 'QR 저장하기' });
  await save.getByRole('button', { name: '저장하기', exact: true }).click();
  await expect(save.getByRole('button', { name: '저장 중…', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(save).toBeVisible();
  await expect(save).toHaveCount(0);
  await page.getByLabel('확인할 화면').selectOption('delete-error');
  const deletion = page.getByRole('dialog', { name: '이 QR을 삭제할까요?' });
  await deletion.getByRole('button', { name: 'QR 삭제', exact: true }).click();
  await expect(deletion.getByRole('alert')).toContainText('QR을 삭제하지 못했어요.');
  await deletion.getByRole('button', { name: '취소', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(3);
  await page.getByLabel('확인할 화면').selectOption('list-error');
  await expect(page.getByRole('alert')).toContainText('QR 목록을 불러오지 못했어요.');
  await expect(page.getByRole('article')).toHaveCount(3);
  await expect(page.getByRole('heading', { name: '아직 저장한 QR이 없어요' })).toHaveCount(0);
  await page.getByRole('button', { name: '목록 새로고침', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(3);
  await page.getByLabel('확인할 화면').selectOption('loading');
  await expect(page.getByRole('status')).toHaveText('QR 목록을 불러오는 중…');
});

test('saved URL summary omits path, query and fragment while file keeps full payload', async ({ page }) => {
  await page.goto('/publishing.html?screen=list');
  await page.getByRole('button', { name: '+ 새 QR 만들기', exact: true }).click();
  const payload = 'https://example.com/private?token=DO_NOT_SHOW#PRIVATE_FRAGMENT';
  await page.getByRole('textbox', { name: '웹 주소', exact: true }).fill(payload);
  await page.getByRole('button', { name: 'QR 저장하기', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'QR 저장하기' });
  await dialog.getByLabel('QR 이름', { exact: true }).fill('호스트 요약');
  await dialog.getByRole('button', { name: '저장하기', exact: true }).click();
  const item = page.getByRole('article', { name: '호스트 요약' });
  await expect(item.getByText('example.com', { exact: true })).toBeVisible();
  await expect(item).not.toContainText('DO_NOT_SHOW');
  await expect(item).not.toContainText('PRIVATE_FRAGMENT');
  await item.getByRole('button', { name: '다운로드', exact: true }).click();
  const event = page.waitForEvent('download');
  await page.getByRole('dialog', { name: 'QR 다운로드' }).getByRole('button', { name: /SVG 벡터/ }).click();
  const file = await (await event).path();
  const { data, info } = await sharp(await readFile(file!)).resize(1024, 1024).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  expect(jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data).toBe(payload);
});
