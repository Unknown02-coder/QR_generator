import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../App.js';
import { Header } from '../components/Header.js';
import { LoginPage } from '../components/LoginPage.js';
import { MyQrPage } from '../components/MyQrPage.js';
import { SaveDialog } from '../components/SaveDialog.js';
import { DeleteDialog } from '../components/DeleteDialog.js';
import { DownloadDialog } from '../components/DownloadDialog.js';
import { AccountActionError, type SavedQrItem, type SaveTarget, type SaveRequest } from '../account/types.js';
import { generateQr } from '../qr/generate.js';
import { prepareQrFile, type DownloadFormat } from '../qr/export.js';
import type { QrType } from '../qr/payload.js';
import { examples, makeExample } from './fixtures.js';
import styles from '../App.module.css';
import preview from './preview.module.css';
import '../styles.css';

const scenes = { list: '내 QR 목록', empty: '내 QR 빈 목록', login: '로그인', 'login-error': '로그인 실패', save: 'QR 저장 창', 'save-error': 'QR 저장 실패', download: '저장 QR 다운로드', 'download-error': '저장 QR 다운로드 실패', delete: 'QR 삭제 확인', 'delete-error': 'QR 삭제 실패', 'auth-expired': '저장 중 인증 만료', 'download-auth': '다운로드 중 인증 만료', unavailable: '삭제·접근 불가 QR', loading: '목록 불러오는 중', 'list-error': '목록 조회 실패' };
type Scene = keyof typeof scenes;
const currentExample: SaveTarget = { type: 'URL', payload: 'https://example.com' };
const delay = () => new Promise<void>(resolve => setTimeout(resolve, 350));

function PublishingScreen({ scene }: { scene: Scene }) {
  const isSave = scene.startsWith('save') || scene === 'auth-expired';
  const isDownload = scene.startsWith('download') || scene === 'unavailable';
  const [view, setView] = useState<'generator' | 'login' | 'myqr'>(isSave ? 'generator' : scene.startsWith('login') ? 'login' : 'myqr');
  const [loggedIn, setLoggedIn] = useState(!scene.startsWith('login'));
  const [rows, setRows] = useState(scene === 'empty' ? [] : examples);
  const [filter, setFilter] = useState<QrType | 'ALL'>('ALL');
  const [saveTarget, setSaveTarget] = useState<SaveTarget | null>(isSave ? currentExample : null);
  const [name, setName] = useState('행사 안내');
  const [saveRequest, setSaveRequest] = useState<SaveRequest | null>(null);
  const [download, setDownload] = useState<SavedQrItem | null>(isDownload ? examples[0]!.metadata : null);
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>('png');
  const [deletion, setDeletion] = useState<SavedQrItem | null>(scene.startsWith('delete') ? examples[0]!.metadata : null);
  const [pending, setPending] = useState<'save' | 'download' | 'delete' | null>(null);
  const [listState, setListState] = useState<'loading' | 'error' | null>(scene === 'loading' ? 'loading' : scene === 'list-error' ? 'error' : null);
  const failOnce = useRef(scene.endsWith('-error') || scene === 'auth-expired' || scene === 'download-auth');
  const nextId = useRef(4);
  const focusAfterDelete = useRef(false);
  useEffect(() => {
    if (!deletion && focusAfterDelete.current) {
      focusAfterDelete.current = false;
      (document.getElementById('new-qr-top') || document.getElementById('new-qr-empty'))?.focus();
    }
  }, [deletion]);
  function login(target?: SaveTarget) {
    setLoggedIn(true);
    if (target) { setSaveTarget(target); setName(''); setSaveRequest(null); }
    setView(pending === 'download' || pending === 'delete' ? 'myqr' : 'generator');
    setPending(null);
  }
  function reauthenticate(kind: 'save' | 'download' | 'delete') { setPending(kind); setView('login'); setLoggedIn(false); }
  function fail(reason: 'auth' | 'failure') { if (failOnce.current) { failOnce.current = false; throw new AccountActionError(reason); } }
  async function save(source: SaveTarget, title: string, _requestKey: string) {
    await delay(); fail(scene === 'auth-expired' ? 'auth' : 'failure');
    const id = `00000000-0000-4000-8000-${String(nextId.current++).padStart(12, '0')}`;
    const summary = source.type === 'URL' ? new URL(source.payload).hostname : source.type === 'CONTACT' ? '연락처 정보' : source.type === 'WIFI' ? '와이파이 정보' : source.type === 'EMAIL' ? '이메일 작성' : '텍스트 QR';
    setRows(previous => [makeExample(id, title, source, '2026-10-10T00:00:00Z', summary), ...previous]);
    setSaveTarget(null); setView('myqr'); setFilter('ALL');
  }
  async function prepare(id: string, format: DownloadFormat) {
    await delay();
    if (scene === 'unavailable') throw new AccountActionError('unavailable');
    fail(scene === 'download-auth' ? 'auth' : 'failure');
    const row = rows.find(row => row.metadata.id === id);
    if (!row) throw new AccountActionError('unavailable');
    const qr = generateQr(row.source.payload);
    if (!qr.ok) throw new AccountActionError('failure');
    return prepareQrFile(qr, row.source.type, format);
  }
  async function remove(id: string) {
    await delay(); fail('failure');
    focusAfterDelete.current = true;
    setRows(previous => previous.filter(row => row.metadata.id !== id)); setDeletion(null);
  }
  function refresh() { setDownload(null); setListState(null); setView('myqr'); }
  const visibleRows = rows.filter(row => filter === 'ALL' || row.metadata.type === filter).map(row => row.metadata);
  return <>
    <div hidden={view !== 'generator'}><App initialInput={{ type: 'URL', url: 'https://example.com' }} account={loggedIn ? { onSave: target => { setSaveTarget(target); setName(''); setSaveRequest(null); }, onMyQr: () => setView('myqr'), onLogout: () => { setLoggedIn(false); setView('login'); } } : undefined} loginPreview={{ enabled: true, onLogin: login }} /></div>
    {view !== 'generator' && <div className={styles.app}><Header current={view} loggedIn={loggedIn} onGenerator={() => setView('generator')} onMyQr={() => setView(loggedIn ? 'myqr' : 'login')} onAuth={() => { setLoggedIn(false); setView('login'); }} /><main>
      {view === 'login' ? <LoginPage enabled error={scene === 'login-error'} onLogin={() => login()} onGuest={() => { setLoggedIn(false); setView('generator'); setSaveTarget(null); setDownload(null); setDeletion(null); setPending(null); }} /> : <MyQrPage items={listState === 'loading' ? [] : visibleRows} totalCount={visibleRows.length} filter={filter} onFilter={setFilter} onCreate={() => setView('generator')} onDownload={item => { setDownloadFormat('png'); setDownload(item); }} onDelete={setDeletion} loading={listState === 'loading'} error={listState === 'error' ? 'QR 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' : undefined} onRefresh={refresh} />}
    </main>{view === 'login' && <p className={styles.footer}>계정에 보관하려면 GitHub 로그인이 필요해요. 비로그인 다운로드도 가능해요.</p>}</div>}
    {saveTarget && view === 'generator' && <SaveDialog target={saveTarget} name={name} request={saveRequest} onRequestChange={setSaveRequest} onNameChange={setName} onSave={save} onClose={() => setSaveTarget(null)} onLogin={() => reauthenticate('save')} />}
    {download && view === 'myqr' && <DownloadDialog saved={download} prepareFile={prepare} initialFormat={downloadFormat} onFormatChange={setDownloadFormat} onClose={() => setDownload(null)} onRefresh={refresh} onLogin={() => reauthenticate('download')} />}
    {deletion && view === 'myqr' && <DeleteDialog item={deletion} onDelete={remove} onClose={() => setDeletion(null)} onLogin={() => reauthenticate('delete')} />}
  </>;
}
function Catalog() {
  const initial = new URLSearchParams(location.search).get('screen');
  const [scene, setScene] = useState<Scene>(initial && Object.hasOwn(scenes, initial) ? initial as Scene : 'list');
  return <><aside className={preview.toolbar} aria-label="퍼블리싱 확인 도구"><div><strong>화면 퍼블리싱 미리보기</strong><p>예시 데이터 · 실제 로그인·계정 저장은 연결 전입니다.</p></div><label htmlFor="scene">확인할 화면</label><select id="scene" value={scene} onChange={event => setScene(event.target.value as Scene)}>{Object.entries(scenes).map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select><a href="/">실제 앱 열기</a></aside><PublishingScreen key={scene} scene={scene} /></>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Catalog /></StrictMode>);
