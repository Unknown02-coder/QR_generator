import { useState } from 'react';
import type { QrPage, SavedQr } from '../api/client';
import { previewUrl } from '../api/client';
import { qrTypes, type QrType } from '../qr/payload';
import { visiblePageNumbers } from './pagination';
import styles from './Dashboard.module.css';

type Props = {
  data: QrPage | null;
  filter: QrType | 'all';
  page: number;
  loading: boolean;
  error: string | null;
  demo: boolean;
  guest: boolean;
  onLogin: () => void;
  onFilter: (type: QrType | 'all') => void;
  onPage: (page: number) => void;
  onRetry: () => void;
  onCreate: () => void;
  onDownload: (qr: SavedQr) => void;
  onDelete: (qr: SavedQr) => void;
};

function QrThumb({ id, demo }: { id: string; demo: boolean }) {
  const [broken, setBroken] = useState(false);
  if (broken && !demo) return <div className={styles.thumb} role="img" aria-label="미리보기를 불러오지 못했어요" />;
  return demo
    ? <svg className={styles.thumb} viewBox="0 0 64 64" aria-hidden="true" fill="#191f28"><path fillRule="evenodd" d="M1 1h23v23H1zm4 4v15h15V5zm4 4h7v7H9zM40 1h23v23H40zm4 4v15h15V5zm4 4h7v7h-7zM1 40h23v23H1zm4 4v15h15V44zm4 4h7v7H9z"/><path d="M29 2h5v6h-5zM29 13h6v5h-6zM28 25h5v7h-5zM39 29h6v6h-6zM50 28h5v7h-5zM60 30h4v5h-4zM28 40h5v5h-5zM37 42h5v5h-5zM48 40h7v5h-7zM58 42h6v6h-6zM28 53h6v5h-6zM38 54h5v6h-5zM48 51h5v5h-5zM58 55h5v7h-5z"/></svg>
    : <img className={styles.thumb} src={previewUrl(id)} alt="" onError={() => setBroken(true)} />;
}

export default function Dashboard({ data, filter, page, loading, error, demo, guest, onLogin, onFilter, onPage, onRetry, onCreate, onDownload, onDelete }: Props) {
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 5));
  const start = total ? (page - 1) * 5 + 1 : 0;
  const end = Math.min(page * 5, total);
  if (guest) return <>
    <div className={styles.hero}><h1>내 QR</h1><p>저장한 QR을 찾아보고, 다운로드하거나 삭제할 수 있어요.</p></div>
    <div className={styles.toolbar}><h2>저장한 QR</h2><button type="button" className={styles.primary} onClick={onCreate}>+ 새 QR 만들기</button></div>
    <section className={styles.list} aria-label="저장한 QR 목록">
      <div className={styles.empty}>
        <div className={styles.emptyIcon}><QrThumb id="guest" demo /></div>
        <h3>로그인하면 내 QR 목록을 볼 수 있어요</h3>
        <p>GitHub로 로그인해 저장한 QR을 확인하고 다시 다운로드하세요.</p>
        <button type="button" className={styles.primary} onClick={onLogin}>GitHub로 계속하기</button>
      </div>
    </section>
  </>;
  return <>
    <div className={styles.hero}><h1>내 QR</h1><p>저장한 QR을 찾아보고, 다운로드하거나 삭제할 수 있어요.</p></div>
    <div className={styles.toolbar}><h2>저장한 QR {total}개</h2><button type="button" className={styles.primary} onClick={onCreate}>+ 새 QR 만들기</button></div>
    <section className={styles.list} aria-label="저장한 QR 목록">
      <div className={styles.filters} role="group" aria-label="QR 유형 필터">
        {[{ id: 'all' as const, label: '전체' }, ...qrTypes].map(item => <button type="button" key={item.id} aria-pressed={filter === item.id} onClick={() => onFilter(item.id)}>{item.label}</button>)}
      </div>
      {loading && <p className={styles.state}>QR 목록을 불러오는 중이에요.</p>}
      {error && <div className={styles.state} role="alert"><p>{error}</p><button type="button" className={styles.retry} onClick={onRetry}>다시 불러오기</button></div>}
      {!loading && !error && data?.items.length === 0 && <div className={styles.empty}>
        <div className={styles.emptyIcon}><QrThumb id="empty" demo /></div>
        <h3>아직 저장한 QR이 없어요</h3>
        <p>새 QR을 만들고 저장하면 이곳에서 다시 받을 수 있어요.</p>
        <button type="button" className={styles.primary} onClick={onCreate}>QR 만들기</button>
      </div>}
      {!loading && !error && data?.items.map(qr => <article className={styles.row} key={qr.id}>
        <QrThumb id={qr.id} demo={demo} />
        <div className={styles.details}><span className={styles.badge}>{qrTypes.find(item => item.id === qr.type)?.label}</span><h3>{qr.title}</h3><p>{qr.type === 'wifi' || qr.type === 'contact' ? (qr.type === 'wifi' ? '네트워크 정보' : '연락처 정보') : qr.summary}</p></div>
        <time dateTime={qr.createdAt}>{new Date(qr.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '')}</time>
        <div className={styles.actions}><button type="button" onClick={() => onDownload(qr)}>다운로드</button><button type="button" onClick={() => onDelete(qr)}>QR 삭제</button></div>
      </article>)}
      {!loading && !error && total > 5 && <nav className={styles.pagination} aria-label="QR 목록 페이지">
        <span>{start}–{end} / 전체 {total}개</span>
        <div className={styles.pageButtons}>
          <button type="button" disabled={page === 1} onClick={() => onPage(page - 1)}>이전</button>
          {visiblePageNumbers(page, pages).map(number => <button type="button" key={number} aria-current={page === number ? 'page' : undefined} onClick={() => onPage(number)}>{number}</button>)}
          <button type="button" disabled={page === pages} onClick={() => onPage(page + 1)}>다음</button>
        </div>
      </nav>}
    </section>
    <p className={styles.note}>Wi-Fi 비밀번호와 연락처의 상세 정보는 목록에 표시하지 않아요.</p>
    {demo && <p className={styles.demoNote}>개발용 화면 미리보기 · 예시 데이터</p>}
  </>;
}
