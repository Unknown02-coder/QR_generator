import { useMemo, useState } from 'react';
import { QrForm } from './components/QrForm.js';
import { DownloadDialog, type DownloadTarget } from './components/DownloadDialog.js';
import { buildPayload, type QrInput, type QrType } from './qr/payload.js';
import { generateQr } from './qr/generate.js';
import styles from './App.module.css';

const types: { type: QrType; label: string; description: string }[] = [
  { type: 'URL', label: '웹 주소', description: '웹 주소를 확인해 주세요.' },
  { type: 'WIFI', label: '와이파이', description: '네트워크 정보를 확인해 주세요.' },
  { type: 'CONTACT', label: '연락처', description: '연락처 정보를 확인해 주세요.' },
  { type: 'TEXT', label: '텍스트', description: '내용을 확인해 주세요.' },
  { type: 'EMAIL', label: '이메일', description: '이메일 정보를 확인해 주세요.' },
];
type InputMap = { [Type in QrType]: Extract<QrInput, { type: Type }> };
const initialInputs: InputMap = {
  URL: { type: 'URL', url: '' },
  WIFI: { type: 'WIFI', ssid: '', security: 'WPA', password: '' },
  CONTACT: { type: 'CONTACT', familyName: '', givenName: '', phone: '', email: '', company: '', website: '' },
  TEXT: { type: 'TEXT', text: '' },
  EMAIL: { type: 'EMAIL', recipient: '', subject: '', body: '' },
};

export function App() {
  const [active, setActive] = useState<QrType>('URL');
  const [inputs, setInputs] = useState(initialInputs);
  const [touched, setTouched] = useState<Partial<Record<QrType, boolean>>>({});
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [screen, setScreen] = useState<'generator' | 'login'>('generator');
  const [downloadTarget, setDownloadTarget] = useState<DownloadTarget | null>(null);
  const [attempt, setAttempt] = useState(0);
  const input = inputs[active];
  const conversion = useMemo(() => buildPayload(input), [input]);
  const qr = useMemo(() => conversion.ok ? generateQr(conversion.payload) : null, [conversion, attempt]);
  const currentType = types.find(t => t.type === active)!;
  const summary = input.type === 'URL' ? input.url : input.type === 'WIFI' ? input.ssid : input.type === 'CONTACT' ? '연락처 정보' : input.type === 'EMAIL' ? '이메일 작성' : '텍스트 QR';

  function change(field: string, value: string) {
    setInputs(previous => ({ ...previous, [active]: { ...previous[active], [field]: value } }));
    setTouched(previous => ({ ...previous, [active]: true }));
    if (field === 'security') setPasswordVisible(false);
  }
  function switchType(type: QrType) {
    setActive(type);
    setPasswordVisible(false);
  }
  function showLogin() { setScreen('login'); setPasswordVisible(false); }

  return <div className={styles.app}>
    <header className={styles.header}>
      <button className={styles.brand} onClick={() => setScreen('generator')}>QR 만들기</button>
      <nav aria-label="주 메뉴"><button onClick={showLogin}>GitHub 로그인</button><button onClick={showLogin}>내 QR</button></nav>
    </header>
    <main>
      {screen === 'generator' ? <>
        <section className={styles.heading}><h1>필요한 QR을 빠르게 만들어요</h1><p>로그인 없이 바로 다운로드하거나, 로그인해 내 QR에 보관하세요.</p></section>
        <div className={styles.columns}>
          <section className={styles.card} aria-labelledby="input-heading">
            <h2 id="input-heading">어떤 QR이 필요한가요?</h2>
            <div className={styles.tabs} role="tablist" aria-label="QR 유형">
              {types.map((type, index) => <button key={type.type} role="tab" id={`tab-${type.type}`} aria-controls="input-panel" aria-selected={type.type === active} tabIndex={type.type === active ? 0 : -1} onClick={() => switchType(type.type)} onKeyDown={event => {
                let target: QrType | undefined;
                if (event.key === 'ArrowRight') target = types[(index + 1) % types.length]!.type;
                if (event.key === 'ArrowLeft') target = types[(index + types.length - 1) % types.length]!.type;
                if (event.key === 'Home') target = 'URL';
                if (event.key === 'End') target = 'EMAIL';
                if (target) { event.preventDefault(); switchType(target); document.getElementById(`tab-${target}`)?.focus(); }
              }}>{type.label}</button>)}
            </div>
            <div id="input-panel" role="tabpanel" aria-labelledby={`tab-${active}`} className={styles.form}>
              <QrForm input={input} errors={!conversion.ok && touched[active] ? conversion.errors : {}} onChange={change} visible={passwordVisible} onToggle={() => setPasswordVisible(value => !value)} />
              {qr && !qr.ok && qr.code === 'capacity' && <p className={styles.fieldError}>{qr.message}</p>}
            </div>
          </section>
          <section className={styles.card} aria-labelledby="preview-heading">
            <h2 id="preview-heading">미리보기</h2>
            <p className={styles.previewHint}>입력 내용이 바뀌면 QR도 바로 갱신돼요.</p>
            <div className={styles.preview} aria-live="polite" aria-atomic="true">
              {qr?.ok ? <img width="232" height="232" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr.svg)}`} alt={`${currentType.label} QR 미리보기`} /> : <div>
                <h3>{touched[active] ? 'QR을 만들 수 없어요' : 'QR을 미리 볼 수 있어요'}</h3>
                <p>{qr && !qr.ok ? qr.message : touched[active] ? currentType.description : '왼쪽에 내용을 입력해 주세요.'}</p>
                {qr && !qr.ok && qr.code === 'generation' && <button className={styles.secondary} onClick={() => setAttempt(value => value + 1)}>다시 생성</button>}
              </div>}
            </div>
            <p className={styles.summary}>{qr?.ok ? `${currentType.label} · ${summary}` : '오류를 수정하면 미리보기가 나타나요.'}</p>
            <div className={styles.actions}>
              <button className={styles.primary} disabled={!qr?.ok} onClick={() => { if (qr?.ok) setDownloadTarget({ type: active, qr }); }}>QR 다운로드</button>
              <button className={styles.secondary} disabled={!qr?.ok} onClick={showLogin}>로그인하고 저장</button>
            </div>
            <p className={styles.small}>비로그인 사용 · 계정에 보관하지 않아요. QR은 여러 번 스캔할 수 있어요.</p>
          </section>
        </div>
      </> : <>
        <section className={styles.heading}><h1>로그인하거나 바로 사용하세요</h1><p>로그인하면 내 QR에 보관할 수 있고, 비로그인으로도 바로 다운로드할 수 있어요.</p></section>
        <section className={styles.loginCard}>
          <div className={styles.loginIllustration}>
            {qr?.ok ? <img width="160" height="160" src={`data:image/svg+xml,${encodeURIComponent(qr.svg)}`} alt="현재 QR" /> : <span className={styles.qrSymbol} aria-hidden="true">▦</span>}
            <h2>먼저 저장하고, 필요할 때 다운로드</h2><p>PNG·SVG 파일을 언제든 다시 받을 수 있어요.</p>
          </div>
          <div className={styles.loginContent}><h2>GitHub로 시작하기</h2><p>별도 비밀번호를 만들지 않고 로그인할 수 있어요.</p>
            <button className={styles.github} disabled aria-describedby="account-status">GitHub로 계속하기</button>
            <p id="account-status" className={styles.hint}>계정 보관은 준비 중이에요. 지금은 비로그인으로 QR을 다운로드할 수 있어요.</p>
            <button className={styles.secondary} onClick={() => setScreen('generator')}>비로그인으로 사용하기</button>
            <h3>로그인하면 사용할 수 있어요</h3><ul><li>내가 저장한 QR 목록 보기</li><li>저장한 QR을 PNG 또는 SVG로 다운로드</li><li>필요 없는 QR 삭제</li></ul>
            <p className={styles.hint}>새로고침하면 입력은 사라져요. QR은 여러 번 스캔할 수 있어요.</p>
          </div>
        </section>
      </>}
      <p className={styles.footer}>QR에는 입력한 내용이 그대로 담겨요. 공유 전 내용을 확인해 주세요.</p>
    </main>
    {downloadTarget && <DownloadDialog target={downloadTarget} onClose={() => setDownloadTarget(null)} />}
  </div>;
}
