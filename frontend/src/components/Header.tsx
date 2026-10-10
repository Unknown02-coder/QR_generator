import styles from '../App.module.css';

export function Header({ loggedIn = false, current, onGenerator, onMyQr, onAuth }: { loggedIn?: boolean; current: 'generator' | 'myqr' | 'login'; onGenerator: () => void; onMyQr: () => void; onAuth: () => void }) {
  return <header className={styles.header}>
    <button className={styles.brand} onClick={onGenerator}>QR 만들기</button>
    <nav aria-label="주 메뉴">
      {current !== 'generator' ? <button onClick={onGenerator}>QR 만들기</button> : <button onClick={onAuth}>{loggedIn ? '로그아웃' : 'GitHub 로그인'}</button>}
      <button aria-current={current === 'myqr' ? 'page' : undefined} onClick={onMyQr}>내 QR</button>
      {current !== 'generator' && <button onClick={onAuth}>{loggedIn ? '로그아웃' : 'GitHub 로그인'}</button>}
    </nav>
  </header>;
}
