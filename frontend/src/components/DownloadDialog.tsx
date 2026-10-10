import { useRef, useState } from 'react';
import { DOWNLOAD_ERROR, downloadFile, prepareQrFile, type DownloadFormat } from '../qr/export.js';
import type { QrResult } from '../qr/generate.js';
import type { QrType } from '../qr/payload.js';
import { AccountActionError } from '../account/types.js';
import { Modal } from './Modal.js';
import styles from '../App.module.css';

export type DownloadTarget = { type: QrType; qr: Extract<QrResult, { ok: true }> };
type FileResult = { blob: Blob; filename: string };
type Props = { onClose: () => void } & (
  { target: DownloadTarget } |
  { saved: { id: string; title: string }; prepareFile: (id: string, format: DownloadFormat) => Promise<FileResult>; onLogin: () => void; onRefresh: () => void; initialFormat?: DownloadFormat; onFormatChange?: (format: DownloadFormat) => void }
);

export function DownloadDialog(props: Props) {
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [format, setFormat] = useState<DownloadFormat>('saved' in props ? props.initialFormat || 'png' : 'png');
  const [error, setError] = useState<'failure' | 'auth' | 'unavailable' | null>(null);
  const isSaved = 'saved' in props;
  const blocked = error === 'auth' || error === 'unavailable';
  const close = () => { if (!busyRef.current) props.onClose(); };

  async function download(selected: DownloadFormat) {
    if (busyRef.current || blocked) return;
    busyRef.current = true;
    setBusy(true); setFormat(selected); setError(null);
    if ('saved' in props) props.onFormatChange?.(selected);
    try {
      const file = 'saved' in props
        ? await props.prepareFile(props.saved.id, selected)
        : await prepareQrFile(props.target.qr, props.target.type, selected);
      downloadFile(file.blob, file.filename);
    } catch (e) {
      setError(isSaved && e instanceof AccountActionError ? e.reason : 'failure');
    } finally { busyRef.current = false; setBusy(false); }
  }
  const errorMessage = error === 'auth' ? 'GitHub 로그인 후 다시 시도해 주세요.' : error === 'unavailable' ? '이 QR을 다운로드할 수 없어요. 내 QR 목록을 새로고침해 주세요.' : DOWNLOAD_ERROR;
  return <Modal titleId="download-title" descriptionId="download-description" onClose={close}>
    <button className={styles.close} disabled={busy} onClick={close}>닫기</button>
    <h2 id="download-title">QR 다운로드</h2>
    <p id="download-description">{'saved' in props ? `‘${props.saved.title}’를 어떤 파일로 받을까요?` : '현재 만든 QR을 어떤 파일로 받을까요?'}</p>
    {!isSaved && <p className={styles.hint}>계정에 보관하지 않아요. QR은 여러 번 스캔할 수 있어요.</p>}
    <div className={styles.formats} aria-busy={busy}>
      <button className={format === 'png' ? styles.selectedFormat : ''} aria-pressed={format === 'png'} disabled={busy || blocked} onClick={() => void download('png')}><strong>PNG 이미지</strong><span>공유와 인쇄에 쓸 수 있는 이미지 파일</span></button>
      <button className={format === 'svg' ? styles.selectedFormat : ''} aria-pressed={format === 'svg'} disabled={busy || blocked} onClick={() => void download('svg')}><strong>SVG 벡터</strong><span>크기를 바꿔도 선명한 벡터 파일</span></button>
    </div>
    {busy && <p role="status">파일 준비 중…</p>}
    {error && <div className={styles.errorBox}><p role="alert">{errorMessage}</p>
      {error === 'failure' ? <><p>{isSaved ? '저장한 QR과 선택한 파일 형식은 유지돼요.' : '현재 입력과 선택한 파일 형식은 유지돼요.'}</p><button className={styles.primary} onClick={() => void download(format)} disabled={busy}>다시 다운로드</button></>
        : 'saved' in props && <button className={styles.primary} onClick={error === 'auth' ? props.onLogin : props.onRefresh}>{error === 'auth' ? '로그인하고 다시 시도' : '목록 새로고침'}</button>}
    </div>}
    <p className={styles.hint}>파일 형식을 선택하면 다운로드가 시작돼요.</p>
    {!isSaved && <p className={styles.hint}>받은 파일은 새로고침하거나 탭을 닫아도 사용할 수 있어요.</p>}
  </Modal>;
}
