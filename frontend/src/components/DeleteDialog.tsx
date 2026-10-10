import { useRef, useState } from 'react';
import { Modal } from './Modal.js';
import { AccountActionError, type SavedQrItem } from '../account/types.js';
import styles from '../App.module.css';
import account from './account.module.css';

export function DeleteDialog({ item, onDelete, onClose, onLogin }: { item: SavedQrItem; onDelete: (id: string) => Promise<void>; onClose: () => void; onLogin: () => void }) {
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<'auth' | 'failure' | null>(null);
  const close = () => { if (!locked.current) onClose(); };
  async function remove() {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(null);
    try { await onDelete(item.id); }
    catch (e) { setError(e instanceof AccountActionError && e.reason === 'auth' ? 'auth' : 'failure'); }
    finally { locked.current = false; setBusy(false); }
  }
  return <Modal titleId="delete-title" descriptionId="delete-description" className={account.deleteDialog} onClose={close}>
    <h2 id="delete-title">이 QR을 삭제할까요?</h2><div id="delete-description" className={account.deleteDescription}><p>‘{item.title}’가 내 QR 목록에서 사라져요.</p><p>삭제한 항목은 다시 다운로드할 수 없어요.</p></div>
    {error && <div className={account.feedback}><p role="alert">{error === 'auth' ? 'GitHub 로그인 후 다시 시도해 주세요.' : 'QR을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.'}</p></div>}
    <div className={account.dialogActions}><button className={account.neutral} disabled={busy} onClick={close}>취소</button>{error === 'auth' ? <button className={styles.primary} onClick={onLogin}>로그인하고 다시 시도</button> : <button className={account.danger} disabled={busy} onClick={() => void remove()}>{busy ? '삭제 중…' : 'QR 삭제'}</button>}</div>
  </Modal>;
}
