import type { QrType } from '../qr/payload';

export type User = { id: string; login: string };
export type SavedQr = {
  id: string;
  type: QrType;
  title: string;
  summary: string;
  createdAt: string;
};
export type QrPage = { items: SavedQr[]; total: number; page: number; pageSize: number };

const base = import.meta.env.VITE_API_BASE_URL ?? '';

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(response.status === 401 ? '로그인이 필요해요.' : '서버 요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.');
  return response.json() as Promise<T>;
}

async function csrfHeaders(): Promise<Record<string, string>> {
  const response = await fetch(`${base}/api/csrf`, { credentials: 'include' });
  const { headerName, token } = await parseResponse<{ headerName: string; token: string }>(response);
  return { [headerName]: token };
}

export async function getCurrentUser(): Promise<User | null> {
  const response = await fetch(`${base}/api/me`, { credentials: 'include' });
  if (response.status === 401) return null;
  return parseResponse<User>(response);
}

export async function getQrPage(page: number, type: QrType | 'all'): Promise<QrPage> {
  const params = new URLSearchParams({ page: String(page), size: '5' });
  if (type !== 'all') params.set('type', type);
  return parseResponse<QrPage>(await fetch(`${base}/api/qrs?${params}`, { credentials: 'include' }));
}

export async function saveQr(input: { type: QrType; title: string; payload: string }): Promise<SavedQr> {
  return parseResponse<SavedQr>(await fetch(`${base}/api/qrs`, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...await csrfHeaders() },
    body: JSON.stringify(input),
  }));
}

export async function deleteQr(id: string): Promise<void> {
  const response = await fetch(`${base}/api/qrs/${encodeURIComponent(id)}`, {
    method: 'DELETE', credentials: 'include', headers: await csrfHeaders(),
  });
  if (!response.ok) throw new Error('QR을 삭제하지 못했어요. 다시 시도해 주세요.');
}

export async function downloadQr(id: string, format: 'png' | 'svg', type: QrType): Promise<void> {
  const response = await fetch(`${base}/api/qrs/${encodeURIComponent(id)}/download?format=${format}`, { credentials: 'include' });
  if (!response.ok) throw new Error('QR을 다운로드하지 못했어요. 다시 시도해 주세요.');
  const contentType = response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  if (contentType !== (format === 'png' ? 'image/png' : 'image/svg+xml')) {
    throw new Error('QR 파일 대신 다른 응답을 받았어요. 로그인 상태를 확인한 뒤 다시 시도해 주세요.');
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `qr-${type}.${format}`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function previewUrl(id: string): string {
  return `${base}/api/qrs/${encodeURIComponent(id)}/preview`;
}

export async function logOut(): Promise<void> {
  const response = await fetch(`${base}/logout`, { method: 'POST', credentials: 'include', headers: await csrfHeaders() });
  if (!response.ok) throw new Error('로그아웃하지 못했어요. 다시 시도해 주세요.');
}

export function githubLoginUrl(): string {
  return `${base}/oauth2/authorization/github`;
}
