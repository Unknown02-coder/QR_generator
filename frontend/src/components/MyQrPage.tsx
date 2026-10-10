import { typeLabels, type SavedQrItem } from '../account/types.js';
import type { QrType } from '../qr/payload.js';
import { generateQr } from '../qr/generate.js';
import styles from '../App.module.css';
import account from './account.module.css';

const emptyIllustration = generateQr('https://example.com');
export function MyQrPage({ items, totalCount, filter, onFilter, onCreate, onDownload, onDelete, hasNext = false, loading = false, error, onRefresh, onMore }: { items: SavedQrItem[]; totalCount: number; filter: QrType | 'ALL'; onFilter: (filter: QrType | 'ALL') => void; onCreate: () => void; onDownload: (item: SavedQrItem) => void; onDelete: (item: SavedQrItem) => void; hasNext?: boolean; loading?: boolean; error?: string; onRefresh?: () => void; onMore?: () => void }) {
  return <>
    <section className={`${styles.heading} ${account.heading}`}><h1>내 QR</h1><p>저장한 QR을 찾아보고, 다운로드하거나 삭제할 수 있어요.</p></section>
    {(totalCount > 0 || filter !== 'ALL') && <div className={account.toolbar}><h2>저장한 QR {totalCount}개</h2><button id="new-qr-top" className={styles.primary} onClick={onCreate}>+ 새 QR 만들기</button></div>}
    <section className={account.list} aria-label="저장한 QR 목록" aria-busy={loading}>
      {(totalCount > 0 || filter !== 'ALL') && <div className={account.filters} role="group" aria-label="저장 QR 유형 필터">
        {(['ALL', 'URL', 'WIFI', 'CONTACT', 'TEXT', 'EMAIL'] as const).map(type => <button key={type} aria-pressed={type === filter} onClick={() => onFilter(type)}>{type === 'ALL' ? '전체' : typeLabels[type]}</button>)}
      </div>}
      {error && <div className={account.feedback}><p role="alert">{error}</p><button className={styles.secondary} onClick={onRefresh}>목록 새로고침</button></div>}
      {loading && !items.length ? <p className={account.loading} role="status">QR 목록을 불러오는 중…</p> : !items.length && !error ? <div className={account.empty}>
        <div className={account.emptyIcon}>{emptyIllustration.ok && <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(emptyIllustration.svg)}`} width="82" height="82" alt="" />}</div>
        <h2>{filter === 'ALL' ? '아직 저장한 QR이 없어요' : `아직 저장한 ${typeLabels[filter]} QR이 없어요`}</h2>
        <p>QR을 만들고 [QR 저장하기]를 누르면 여기에 모여요.</p><button id="new-qr-empty" className={styles.primary} onClick={onCreate}>첫 QR 만들기</button>
      </div> : items.map(item => <article className={account.row} key={item.id} aria-label={item.title}>
        <div className={account.thumbnail}>{item.previewUrl && <img src={item.previewUrl} width="96" height="96" alt={`${typeLabels[item.type]} QR 미리보기`} onError={event => { event.currentTarget.hidden = true; }} />}</div>
        <div className={account.metadata}><span className={account.badge}>{typeLabels[item.type]}</span><h2>{item.title}</h2><p>{item.summary}</p></div>
        <time dateTime={item.createdAt}>{new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(item.createdAt)).replace(/\. /g, '.').replace(/\.$/, '')}</time>
        <div className={account.rowActions}><button className={styles.secondary} onClick={() => onDownload(item)}>다운로드</button><button className={account.neutral} onClick={() => onDelete(item)}>QR 삭제</button></div>
      </article>)}
      {hasNext && <button className={account.more} disabled={loading} onClick={onMore}>{loading ? '불러오는 중…' : '더 보기'}</button>}
    </section>
    <p className={account.listNote}>Wi-Fi 비밀번호와 연락처의 상세 정보는 목록에 표시하지 않아요.</p>
  </>;
}
