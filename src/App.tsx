import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { deleteQr, downloadQr, getCurrentUser, getQrPage, githubLoginUrl, logOut, saveQr, type QrPage, type SavedQr, type User } from './api/client';
import Dashboard from './components/Dashboard';
import Dialog from './components/Dialog';
import dialogStyles from './components/Dialog.module.css';
import Generator from './components/Generator';
import LoginScreen from './components/LoginScreen';
import { demoQrs } from './preview/demoData';
import { createPayload, initialFormValues, qrTypes, type FormValues, type QrType } from './qr/payload';
import { classifyPreviewFailure, type PreviewFailure } from './qr/previewFailure';
import styles from './App.module.css';

type Modal = { kind: 'save' | 'message'; message?: string } | { kind: 'download' | 'delete'; qr: SavedQr };
const demo = import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === 'dashboard';

export default function App() {
  const [screen, setScreen] = useState<'generator' | 'dashboard' | 'login'>(demo ? 'dashboard' : 'login');
  const [type, setType] = useState<QrType>('url');
  const [values, setValues] = useState<FormValues>(initialFormValues);
  const [preview, setPreview] = useState<{ payload: string; url: string } | null>(null);
  const [previewFailure, setPreviewFailure] = useState<{ payload: string; kind: PreviewFailure } | null>(null);
  const [previewRevision, setPreviewRevision] = useState(0);
  const [user, setUser] = useState<User | null>(demo ? { id: 'preview', login: 'preview' } : null);
  const [serverReady, setServerReady] = useState(demo);
  const [checkingServer, setCheckingServer] = useState(false);
  const [modal, setModal] = useState<Modal | null>(null);
  const [loginIntent, setLoginIntent] = useState<'save' | 'dashboard' | 'none'>('none');
  const [loginStatus, setLoginStatus] = useState<'idle' | 'pending' | 'error'>('idle');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState(false);
  const loginTimer = useRef<number | null>(null);
  const [saveName, setSaveName] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<'png' | 'svg' | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [filter, setFilter] = useState<QrType | 'all'>('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<QrPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [demoItems, setDemoItems] = useState(demoQrs);
  const outcome = useMemo(() => createPayload(type, values), [type, values]);
  const payload = outcome.ok ? outcome.payload : null;
  const qrData = payload && preview?.payload === payload ? preview.url : null;
  const qrError = payload && previewFailure?.payload === payload ? previewFailure.kind : null;

  useEffect(() => () => { if (loginTimer.current !== null) window.clearInterval(loginTimer.current); }, []);

  useEffect(() => {
    if (demo) return;
    getCurrentUser().then(current => { setUser(current); setServerReady(true); if (current) setScreen(previous => previous === 'dashboard' ? 'dashboard' : 'generator'); }).catch(() => setServerReady(false));
  }, []);

  useEffect(() => {
    let active = true;
    setPreview(null);
    setPreviewFailure(null);
    if (!payload) return () => { active = false; };
    QRCode.toDataURL(payload, { margin: 4, width: 256, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#FFFFFF' } })
      .then(url => { if (active) setPreview({ payload, url }); })
      .catch(error => { if (active) setPreviewFailure({ payload, kind: classifyPreviewFailure(error) }); });
    return () => { active = false; };
  }, [payload, previewRevision]);

  useEffect(() => {
    if (screen !== 'dashboard') return;
    if (demo) {
      const filtered = filter === 'all' ? demoItems : demoItems.filter(item => item.type === filter);
      setData({ items: filtered.slice((page - 1) * 5, page * 5), total: filtered.length, page, pageSize: 5 });
      setListError(null);
      setLoading(false);
      return;
    }
    if (!user) return;
    let active = true;
    setLoading(true);
    getQrPage(page, filter).then(result => { if (active) { setData(result); setListError(null); } })
      .catch(() => { if (active) setListError('QR 목록을 불러오지 못했어요. 다시 시도해 주세요.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [screen, page, filter, user, revision, demoItems]);

  const showGenerator = () => {
    if (loginTimer.current !== null) { window.clearInterval(loginTimer.current); loginTimer.current = null; }
    setLoginStatus('idle');
    setScreen('generator'); window.scrollTo(0, 0);
  };
  const openLogin = (intent: 'save' | 'dashboard' | 'none') => {
    if (loginTimer.current !== null) { window.clearInterval(loginTimer.current); loginTimer.current = null; }
    setLoginIntent(intent);
    setLoginStatus('idle');
    setLoginError(null);
    setScreen('login'); window.scrollTo(0, 0);
  };
  const showHome = () => {
    if (user) showGenerator();
    else openLogin('none');
  };
  const closeModal = () => {
    if (loginTimer.current !== null) { window.clearInterval(loginTimer.current); loginTimer.current = null; }
    setLoginStatus('idle');
    setModal(null);
  };
  const showDashboard = () => {
    if (!user) {
      if (loginTimer.current !== null) { window.clearInterval(loginTimer.current); loginTimer.current = null; }
      setLoginIntent('dashboard');
      setLoginStatus('idle');
    }
    setScreen('dashboard'); window.scrollTo(0, 0);
  };
  const openSave = () => {
    if (!outcome.ok || !qrData) return;
    setSaveName('');
    setSaveError(null);
    if (user) setModal({ kind: 'save' });
    else openLogin('save');
  };
  const startLogin = async () => {
    if (loginStatus === 'pending' || checkingServer) return;
    setLoginError(null);
    if (!serverReady) {
      setCheckingServer(true);
      try {
        const current = await getCurrentUser();
        setServerReady(true);
        if (current) { setUser(current); setScreen(loginIntent === 'dashboard' ? 'dashboard' : 'generator'); if (loginIntent === 'save') { setAuthNotice(true); setModal({ kind: 'save' }); } return; }
      } catch {
        setLoginStatus('error');
        setLoginError('로그인 서버에 연결하지 못했어요. 서버 상태를 확인하고 다시 시도해 주세요.');
        return;
      } finally { setCheckingServer(false); }
    }
    const popup = window.open(githubLoginUrl(), 'qrGithubLogin', 'width=600,height=760');
    if (!popup) { setLoginStatus('error'); setLoginError('로그인 창을 열지 못했어요. 팝업을 허용한 뒤 다시 시도해 주세요.'); return; }
    setLoginStatus('pending');
    let attempts = 0;
    const timer = window.setInterval(async () => {
      attempts += 1;
      try {
        const current = await getCurrentUser();
        if (loginTimer.current !== timer) return;
        if (current) {
          if (loginTimer.current !== null) { window.clearInterval(loginTimer.current); loginTimer.current = null; }
          setUser(current);
          setLoginStatus('idle');
          setScreen(loginIntent === 'dashboard' ? 'dashboard' : 'generator');
          if (loginIntent === 'save') { setAuthNotice(true); setModal({ kind: 'save' }); }
          window.scrollTo(0, 0);
          return;
        }
      } catch { /* Poll until popup closes or times out. */ }
      if (loginTimer.current !== timer) return;
      if (popup.closed || attempts >= 120) {
        if (loginTimer.current !== null) { window.clearInterval(loginTimer.current); loginTimer.current = null; }
        setLoginStatus('error');
        setLoginError('GitHub 로그인을 완료하지 못했어요. 입력한 내용은 유지돼요. 다시 시도해 주세요.');
      }
    }, 1000);
    loginTimer.current = timer;
  };
  const confirmSave = async () => {
    if (!outcome.ok || !saveName.trim()) return;
    setSaveError(null);
    setWorking(true);
    try {
      await saveQr({ type, title: saveName.trim(), payload: outcome.payload });
      setModal(null); setAuthNotice(false); setRevision(value => value + 1); showDashboard();
    } catch (error) { setSaveError(error instanceof Error ? error.message : 'QR을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.'); }
    finally { setWorking(false); }
  };
  const confirmDelete = async (qr: SavedQr) => {
    setDeleteError(null);
    setWorking(true);
    try {
      if (demo) setDemoItems(items => items.filter(item => item.id !== qr.id));
      else await deleteQr(qr.id);
      setModal(null);
      if (data?.items.length === 1 && page > 1) setPage(page - 1);
      else setRevision(value => value + 1);
    } catch (error) { setDeleteError(error instanceof Error ? error.message : 'QR을 삭제하지 못했어요. 다시 시도해 주세요.'); }
    finally { setWorking(false); }
  };
  const chooseDownload = async (qr: SavedQr, format: 'png' | 'svg') => {
    setDownloadFormat(format);
    setDownloadError(null);
    if (demo) { setDownloadError('예시 데이터는 다운로드할 수 없어요. 실제로 저장한 QR에서 사용할 수 있어요.'); return; }
    setWorking(true);
    try { await downloadQr(qr.id, format, qr.type); setModal(null); }
    catch (error) { setDownloadError(error instanceof Error ? error.message : '파일을 준비하지 못했어요. 잠시 후 다시 시도해 주세요.'); }
    finally { setWorking(false); }
  };
  const signOut = async () => {
    if (demo) { setModal({ kind: 'message', message: '개발용 화면 미리보기입니다.' }); return; }
    try { await logOut(); setUser(null); openLogin('none'); }
    catch (error) { setModal({ kind: 'message', message: error instanceof Error ? error.message : '로그아웃하지 못했어요.' }); }
  };

  return <div className={styles.shell}><div className={styles.container}>
    <header className={styles.header}><button type="button" className={styles.brand} aria-label="HandmadeQR 홈으로 이동" onClick={showHome}>HandmadeQR</button><nav className={styles.nav} aria-label="주요 메뉴">
      <button type="button" className={screen === 'generator' ? styles.selected : ''} onClick={showGenerator}>QR 만들기</button><button type="button" className={screen === 'dashboard' ? styles.selected : ''} onClick={showDashboard}>내 QR</button>{user && <button type="button" onClick={signOut}>로그아웃</button>}
    </nav></header>
    <main>
      <div hidden={screen !== 'generator'}>{authNotice && <div className={styles.banner} role="status">GitHub로 로그인했어요. 기존 입력은 유지되고 QR은 아직 저장되지 않았어요. 저장하려면 QR 저장하기를 눌러 주세요.</div>}<Generator type={type} onTypeChange={setType} values={values} setValues={setValues} outcome={outcome} qrData={qrData} qrError={qrError} onRetryPreview={() => setPreviewRevision(value => value + 1)} onSave={openSave} /></div>
      {screen === 'login' && <LoginScreen status={loginStatus} error={loginError} checkingServer={checkingServer} serverReady={serverReady} onLogin={startLogin} onContinue={showGenerator} />}
      {screen === 'dashboard' && <Dashboard data={data} filter={filter} page={page} loading={loading} error={listError} demo={demo} guest={!user} onLogin={() => openLogin('dashboard')} onFilter={value => { if (value === filter && page === 1) return; setLoading(true); setFilter(value); setPage(1); }} onPage={value => { if (value === page) return; setLoading(true); setPage(value); }} onRetry={() => setRevision(value => value + 1)} onCreate={showGenerator} onDownload={qr => { setDownloadFormat(null); setDownloadError(null); setModal({ kind: 'download', qr }); }} onDelete={qr => { setDeleteError(null); setModal({ kind: 'delete', qr }); }} />}
    </main>
  </div>
    {modal?.kind === 'save' && <Dialog title="QR 저장하기" description="이름을 정하고 저장할 내용을 확인해 주세요." onClose={closeModal}>
      <label className={dialogStyles.label} htmlFor="qr-title">QR 이름</label><input id="qr-title" className={dialogStyles.input} value={saveName} maxLength={80} placeholder="예: 행사 안내" onChange={event => { setSaveName(event.target.value); setSaveError(null); }} />
      <div className={dialogStyles.info}>유형: {qrTypes.find(item => item.id === type)?.label}<br />QR 이름과 QR에 담긴 내용이 계정에 보관돼요. Wi-Fi 비밀번호나 연락처도 QR 내용에 포함될 수 있어요.</div>
      {saveError && <p className={dialogStyles.error} role="alert">{saveError} 입력한 내용과 이름은 그대로 유지돼요.</p>}
      <div className={dialogStyles.actions}><button type="button" onClick={closeModal}>취소</button><button type="button" className={dialogStyles.primary} disabled={!saveName.trim() || working} onClick={confirmSave}>{working ? '저장 중…' : saveError ? '다시 저장' : '저장하기'}</button></div>
    </Dialog>}
    {modal?.kind === 'download' && <Dialog title="QR 다운로드" description={`${modal.qr.title} QR의 파일 형식을 선택해 주세요.`} onClose={closeModal}>
      <div className={dialogStyles.choices}><button type="button" aria-pressed={downloadFormat === 'png'} disabled={working} onClick={() => chooseDownload(modal.qr, 'png')}><strong>PNG 이미지</strong><span>1024 × 1024 픽셀 이미지 파일</span></button><button type="button" aria-pressed={downloadFormat === 'svg'} disabled={working} onClick={() => chooseDownload(modal.qr, 'svg')}><strong>SVG 벡터</strong><span>크기를 바꿔도 선명한 벡터 파일</span></button></div>
      {downloadError && <div className={dialogStyles.retryBlock}><p className={dialogStyles.error} role="alert">{downloadError} 선택한 파일 형식은 유지돼요.</p>{!demo && downloadFormat && <button type="button" className={dialogStyles.retry} disabled={working} onClick={() => chooseDownload(modal.qr, downloadFormat)}>다시 다운로드</button>}</div>}
    </Dialog>}
    {modal?.kind === 'delete' && <Dialog title="이 QR을 삭제할까요?" description={`${modal.qr.title} QR을 삭제하면 내 QR에서 다시 다운로드할 수 없어요.`} onClose={closeModal}>
      {deleteError && <p className={dialogStyles.error} role="alert">{deleteError} 이 QR은 목록에 남아 있어요.</p>}
      <div className={dialogStyles.actions}><button type="button" onClick={closeModal}>취소</button><button type="button" className={dialogStyles.danger} disabled={working} onClick={() => confirmDelete(modal.qr)}>{working ? '삭제 중…' : 'QR 삭제'}</button></div>
    </Dialog>}
    {modal?.kind === 'message' && <Dialog title="안내" description={modal.message} onClose={closeModal}><div className={dialogStyles.actions}><button type="button" className={dialogStyles.primary} onClick={closeModal}>확인</button></div></Dialog>}
  </div>;
}
