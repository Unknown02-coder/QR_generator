import QRCode from 'qrcode';

export type QrResult =
  | { ok: true; matrix: { size: number; data: Uint8Array }; svg: string; quietZone: 4 }
  | { ok: false; code: 'empty' | 'capacity' | 'generation'; message: string };

const QUIET_ZONE = 4;
const capacityError = {
  ok: false,
  code: 'capacity',
  message: '내용이 너무 길어요. 내용을 줄여 다시 시도해 주세요.',
} as const;

/** Browser-safe generation: no DOM, storage, network, or payload logging. */
export function generateQr(payload: string): QrResult {
  if (payload.length === 0) {
    return { ok: false, code: 'empty', message: 'QR에 담을 내용을 입력해 주세요.' };
  }

  // Even a version-40 QR at the lowest correction level fits at most 7089
  // numeric characters. Bound impossible inputs before library segmentation.
  // Below this bound, let the library account for encoding modes and UTF-8.
  if (payload.length > 7089) return capacityError;

  try {
    const { modules } = QRCode.create(payload, { errorCorrectionLevel: 'M' });
    const size = modules.size;
    const data = modules.data.slice();
    const extent = size + QUIET_ZONE * 2;
    const paths: string[] = [];

    // Draw contiguous dark runs as numeric coordinates. Payload text is never
    // interpolated into XML, including URLs containing markup-like characters.
    for (let row = 0; row < size; row++) {
      for (let column = 0; column < size;) {
        if (data[row * size + column] !== 1) {
          column++;
          continue;
        }
        const start = column;
        while (column < size && data[row * size + column] === 1) column++;
        const length = column - start;
        paths.push(`M${start + QUIET_ZONE} ${row + QUIET_ZONE}h${length}v1h-${length}z`);
      }
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${extent}" height="${extent}" viewBox="0 0 ${extent} ${extent}" shape-rendering="crispEdges"><rect width="${extent}" height="${extent}" fill="#ffffff"/><path d="${paths.join('')}" fill="#000000"/></svg>`;
    return { ok: true, matrix: { size, data }, svg, quietZone: QUIET_ZONE };
  } catch (error) {
    // qrcode 1.5.4 has a stable, specific capacity failure. Other failures get
    // a separate code so the UI can distinguish them without exposing details.
    if (error instanceof Error && error.message === 'The amount of data is too big to be stored in a QR Code') {
      return capacityError;
    }
    return { ok: false, code: 'generation', message: 'QR을 만들지 못했어요. 내용을 확인하고 다시 시도해 주세요.' };
  }
}
