import styles from './LoginScreen.module.css';

type Props = {
  status: 'idle' | 'pending' | 'error';
  error: string | null;
  checkingServer: boolean;
  serverReady: boolean;
  onLogin: () => void;
  onContinue: () => void;
};

export default function LoginScreen({ status, error, checkingServer, serverReady, onLogin, onContinue }: Props) {
  return <>
    <div className={styles.hero}>
      <h1>로그인하거나 바로 사용하세요</h1>
      <p>입력과 미리보기는 바로 사용할 수 있어요. 저장한 QR은 내 QR에서 다시 다운로드할 수 있어요.</p>
    </div>
    <section className={styles.card} aria-label="GitHub 로그인">
      <div className={styles.illustration} aria-hidden="true">
        <div className={styles.artRow}>
          <svg className={styles.qrArt} viewBox="0 0 64 64" fill="#191f28"><path fillRule="evenodd" d="M1 1h23v23H1zm4 4v15h15V5zm4 4h7v7H9zM40 1h23v23H40zm4 4v15h15V5zm4 4h7v7h-7zM1 40h23v23H1zm4 4v15h15V44zm4 4h7v7H9z"/><path d="M29 2h5v6h-5zM29 13h6v5h-6zM28 25h5v7h-5zM39 29h6v6h-6zM50 28h5v7h-5zM60 30h4v5h-4zM28 40h5v5h-5zM37 42h5v5h-5zM48 40h7v5h-7zM58 42h6v6h-6zM28 53h6v5h-6zM38 54h5v6h-5zM48 51h5v5h-5zM58 55h5v7h-5z"/></svg>
          <span>QR 저장하기</span>
        </div>
        <h2>먼저 저장하고, 필요할 때 다운로드</h2>
        <p>저장한 QR을 PNG·SVG 파일로 언제든 다시 받을 수 있어요.</p>
      </div>
      <div className={styles.content}>
        <h2>GitHub로 시작하기</h2>
        <p>처음 이용하면 서비스 계정이 자동으로 만들어져요.<br />이미 가입했다면 같은 GitHub 계정으로 로그인돼요.</p>
        {status === 'pending' && <div className={styles.status} role="status">별도 GitHub 창에서 인증을 완료해 주세요. 입력한 QR 내용은 이 탭에 유지돼요.</div>}
        {error && <div className={styles.error} role="alert">{error}</div>}
        <button type="button" className={styles.github} disabled={status === 'pending' || checkingServer} onClick={onLogin}>
          {checkingServer ? '서버 확인 중…' : status === 'pending' ? 'GitHub 인증을 기다리는 중…' : status === 'error' ? '로그인 창 다시 열기' : 'GitHub로 계속하기'}
        </button>
        <button type="button" className={styles.guest} onClick={onContinue}>비로그인으로 사용하기</button>
        {!serverReady && <p className={styles.serverNotice}>로그인 서버가 연결되지 않았어요. 서버를 실행한 뒤 다시 시도해 주세요.</p>}
        <h3>로그인하면 사용할 수 있어요</h3>
        <ul>
          <li>내가 저장한 QR 목록 보기</li>
          <li>저장한 QR을 PNG 또는 SVG로 다운로드</li>
          <li>필요 없는 QR 삭제</li>
        </ul>
        <p className={styles.footnote}>입력과 미리보기에는 로그인이 필요하지 않아요. 저장 전 입력은 새로고침하면 사라져요.</p>
      </div>
    </section>
  </>;
}
