import { generateQr } from '../qr/generate.js';
import styles from '../App.module.css';

const illustration = generateQr('https://example.com');
export function LoginPage({ qrSvg, error = false, enabled = false, onLogin, onGuest }: { qrSvg?: string; error?: boolean; enabled?: boolean; onLogin: () => void; onGuest: () => void }) {
  const svg = qrSvg || (illustration.ok ? illustration.svg : undefined);
  return <>
    <section className={styles.heading}><h1>로그인하거나 바로 사용하세요</h1><p>로그인하면 내 QR에 보관할 수 있고, 비로그인으로도 바로 다운로드할 수 있어요.</p></section>
    <section className={styles.loginCard}>
      <div className={styles.loginIllustration}>
        <div className={styles.illustrationQr}>{svg && <img width="170" height="170" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt="QR 보관 안내 예시" />}<span>QR 저장하기</span></div>
        <h2>먼저 저장하고, 필요할 때 다운로드</h2><p>PNG·SVG 파일을 언제든 다시 받을 수 있어요.</p>
      </div>
      <div className={styles.loginContent}>
        <h2>GitHub로 시작하기</h2><p>별도 비밀번호를 만들지 않고 로그인할 수 있어요.</p>
        <button className={styles.github} disabled={!enabled} aria-describedby={!enabled ? 'account-status' : undefined} onClick={onLogin}>GitHub로 계속하기</button>
        <button className={styles.secondary} onClick={onGuest}>비로그인으로 사용하기</button>
        <h3>로그인하면 사용할 수 있어요</h3><ul><li>내가 저장한 QR 목록 보기</li><li>저장한 QR을 PNG 또는 SVG로 다운로드</li><li>필요 없는 QR 삭제</li></ul>
        <p>계정에 보관하지 않고 PNG·SVG를 바로 다운로드해요.</p>
        <p className={styles.hint}>새로고침하면 입력은 사라져요. QR은 여러 번 스캔할 수 있어요.</p>
        {error && <div className={styles.loginError} role="alert"><strong>GitHub 로그인을 완료하지 못했어요.</strong><p>다시 시도해 주세요. 입력한 내용은 그대로 유지돼요.</p></div>}
        {!enabled && <p id="account-status" className={styles.small}>계정 보관은 준비 중이에요. 지금은 비로그인으로 QR을 다운로드할 수 있어요.</p>}
      </div>
    </section>
  </>;
}
