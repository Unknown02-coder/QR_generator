import type { QrType } from '../qr/payload.js';

export const typeLabels: Record<QrType, string> = { URL: '웹 주소', WIFI: '와이파이', CONTACT: '연락처', TEXT: '텍스트', EMAIL: '이메일' };
/** Account list metadata. Plaintext payloads are not part of a list item. */
export type SavedQrItem = { id: string; type: QrType; title: string; summary: string; createdAt: string; previewUrl: string };
export type SaveTarget = { type: QrType; payload: string };
export type SaveRequest = SaveTarget & { title: string; key: string };
export class AccountActionError extends Error {
  constructor(public readonly reason: 'auth' | 'unavailable' | 'failure') { super(reason); }
}
