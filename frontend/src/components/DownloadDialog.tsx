import { useEffect, useRef, useState } from 'react';
import { DOWNLOAD_ERROR, downloadFile, prepareQrFile, type DownloadFormat } from '../qr/export.js';
import type { QrResult } from '../qr/generate.js';
import type { QrType } from '../qr/payload.js';
import styles from '../App.module.css';

export type DownloadTarget = { type: QrType; qr: Extract<QrResult, { ok: true }> };

export function DownloadDialog({ target, onClose }: { target: DownloadTarget; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [format, setFormat] = useState<DownloadFormat>('png');
  const [error, setError] = useState(false);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current!;
    element.showModal();
    return () => { element.close(); previous?.focus(); };
  }, []);

  async function download(selected: DownloadFormat) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setFormat(selected);
    setError(false);
    try {
      const file = await prepareQrFile(target.qr, target.type, selected);
      downloadFile(file.blob, file.filename);
    } catch {
      setError(true);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="download-title" aria-describedby="download-description" onCancel={event => { event.preventDefault(); if (!busyRef.current) onClose(); }}>
    <button className={styles.close} disabled={busy} onClick={onClose}>닫기</button>
    <h2 id="download-title">QR 다운로드</h2>
    <p id="download-description">현재 만든 QR을 어떤 파일로 받을까요?</p>
    <p className={styles.hint}>계정에 보관하지 않아요. QR은 여러 번 스캔할 수 있어요.</p>
    <div className={styles.formats} aria-busy={busy}>
      <button className={format === 'png' ? styles.selectedFormat : ''} disabled={busy} onClick={() => void download('png')}><strong>PNG 이미지</strong><span>공유와 인쇄에 쓸 수 있는 이미지 파일</span></button>
      <button className={format === 'svg' ? styles.selectedFormat : ''} disabled={busy} onClick={() => void download('svg')}><strong>SVG 벡터</strong><span>크기를 바꿔도 선명한 벡터 파일</span></button>
    </div>
    {busy && <p role="status">파일 준비 중…</p>}
    {error && <div className={styles.errorBox}><p role="alert">{DOWNLOAD_ERROR}</p><button className={styles.primary} onClick={() => void download(format)} disabled={busy}>다시 다운로드</button></div>}
    <p className={styles.hint}>파일 형식을 선택하면 다운로드가 시작돼요.</p>
    <p className={styles.hint}>받은 파일은 새로고침하거나 탭을 닫아도 사용할 수 있어요.</p>
  </dialog>;
}
