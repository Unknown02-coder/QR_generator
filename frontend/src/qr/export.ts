import type { QrResult } from './generate.js';
import type { QrType } from './payload.js';

export type DownloadFormat = 'png' | 'svg';
type ValidQr = Extract<QrResult, { ok: true }>;
export const DOWNLOAD_ERROR = '파일을 준비하지 못했어요. 잠시 후 다시 시도해 주세요.';

/** Produce files entirely in the current browser tab. */
export async function prepareQrFile(qr: ValidQr, type: QrType, format: DownloadFormat): Promise<{ blob: Blob; filename: string }> {
  const filename = `qr-${type.toLowerCase()}.${format}`;
  if (format === 'svg') return { blob: new Blob([qr.svg], { type: 'image/svg+xml' }), filename };
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1024;
  const context = canvas.getContext('2d');
  if (!context) throw new Error(DOWNLOAD_ERROR);
  const extent = qr.matrix.size + qr.quietZone * 2;
  const scale = Math.floor(1024 / extent);
  const offset = Math.floor((1024 - extent * scale) / 2);
  if (scale < 1) throw new Error(DOWNLOAD_ERROR);
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, 1024, 1024);
  context.fillStyle = '#000000';
  for (let row = 0; row < qr.matrix.size; row++) {
    for (let column = 0; column < qr.matrix.size; column++) {
      if (qr.matrix.data[row * qr.matrix.size + column] === 1) {
        context.fillRect(offset + (column + qr.quietZone) * scale, offset + (row + qr.quietZone) * scale, scale, scale);
      }
    }
  }
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error(DOWNLOAD_ERROR)), 'image/png'));
  return { blob, filename };
}

export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    // Keep the URL alive while the browser starts consuming the download.
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}
