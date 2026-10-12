import type { SavedQr } from '../api/client';
import type { QrType } from '../qr/payload';

const examples: { type: QrType; title: string; summary: string }[] = [
  { type: 'url', title: '행사 안내', summary: 'example.com' },
  { type: 'wifi', title: '사무실 와이파이', summary: '네트워크 정보' },
  { type: 'contact', title: '김 민지', summary: '연락처 정보' },
  { type: 'text', title: '현장 안내', summary: '안내 문구' },
  { type: 'email', title: '문의 메일', summary: '이메일 작성' },
];

export const demoQrs: SavedQr[] = Array.from({ length: 23 }, (_, index) => {
  const example = examples[index % examples.length];
  return {
    id: `preview-${index + 1}`,
    ...example,
    createdAt: new Date(Date.UTC(2026, 9, 10 - index)).toISOString(),
  };
});
