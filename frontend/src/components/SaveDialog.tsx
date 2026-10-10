import { useRef, useState } from 'react';
import { AccountActionError, type SaveTarget, type SaveRequest } from '../account/types.js';
import { Modal } from './Modal.js';
import styles from '../App.module.css';
import account from './account.module.css';

export function SaveDialog({ target, name, request, onRequestChange, onNameChange, onSave, onClose, onLogin }: { target: SaveTarget; name: string; request: SaveRequest | null; onRequestChange: (request: SaveRequest) => void; onNameChange: (name: string) => void; onSave: (target: SaveTarget, title: string, requestKey: string) => Promise<void>; onClose: () => void; onLogin: () => void }) {
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [validation, setValidation] = useState('');
  const [error, setError] = useState<'auth' | 'failure' | null>(null);
  const close = () => { if (!locked.current) onClose(); };
  async function save() {
    if (locked.current || error === 'auth') return;
    const title = name.trim();
    if (!title || Array.from(title).length > 100) { setValidation(!title ? 'QR 이름을 입력해 주세요.' : 'QR 이름은 100자까지 입력할 수 있어요.'); return; }
    locked.current = true; setBusy(true); setValidation(''); setError(null);
    const attempt = request?.title === title && request.type === target.type && request.payload === target.payload ? request : { ...target, title, key: crypto.randomUUID() };
    onRequestChange(attempt);
    try { await onSave(target, title, attempt.key); }
    catch (e) { setError(e instanceof AccountActionError && e.reason === 'auth' ? 'auth' : 'failure'); }
    finally { locked.current = false; setBusy(false); }
  }
  return <Modal titleId="save-title" descriptionId="save-description" onClose={close} className={account.saveDialog}>
    <h2 id="save-title">QR 저장하기</h2><p id="save-description">나중에 쉽게 찾을 수 있도록 이름을 지어주세요.</p>
    <form onSubmit={event => { event.preventDefault(); void save(); }}>
      <div className={styles.field}><label htmlFor="qr-title">QR 이름</label><input id="qr-title" autoFocus autoComplete="off" disabled={busy} value={name} onChange={event => { onNameChange(event.target.value); setValidation(''); }} aria-invalid={!!validation} aria-describedby={validation ? 'qr-title-error' : 'qr-title-hint'} />
        {validation ? <p className={styles.fieldError} id="qr-title-error" role="alert">{validation}</p> : <p className={account.nameHint} id="qr-title-hint">100자까지 입력할 수 있어요.</p>}</div>
      <div className={styles.tip}><strong>저장되는 정보</strong><p>QR 이름과 QR에 담긴 내용이 계정에 보관돼요.</p>{(target.type === 'WIFI' || target.type === 'CONTACT') && <p>{target.type === 'WIFI' ? 'Wi-Fi 비밀번호' : '연락처 상세 정보'}도 QR 내용에 포함되면 함께 보관돼요.</p>}</div>
      {error && <div className={account.feedback}><p role="alert">{error === 'auth' ? 'GitHub 로그인 후 다시 시도해 주세요.' : 'QR을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.'}</p>{error !== 'auth' && <p>입력한 내용과 QR 이름은 그대로 유지돼요.</p>}</div>}
      <div className={account.dialogActions}><button type="button" className={account.neutral} disabled={busy} onClick={close}>취소</button>{error === 'auth' ? <button type="button" className={styles.primary} onClick={onLogin}>로그인하고 다시 시도</button> : <button className={styles.primary} disabled={busy}>{busy ? '저장 중…' : error ? '다시 저장' : '저장하기'}</button>}</div>
    </form>
  </Modal>;
}
