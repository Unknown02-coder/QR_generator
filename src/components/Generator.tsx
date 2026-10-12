import { useState, type Dispatch, type SetStateAction } from 'react';
import type { FormValues, PayloadOutcome, QrType } from '../qr/payload';
import { qrTypes } from '../qr/payload';
import { getFormErrors } from '../qr/formErrors';
import type { PreviewFailure } from '../qr/previewFailure';
import styles from './Generator.module.css';

type Props = {
  type: QrType;
  onTypeChange: (type: QrType) => void;
  values: FormValues;
  setValues: Dispatch<SetStateAction<FormValues>>;
  outcome: PayloadOutcome;
  qrData: string | null;
  qrError: PreviewFailure | null;
  onRetryPreview: () => void;
  onSave: () => void;
};

type FieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  type?: string;
  multiline?: boolean;
  suffix?: React.ReactNode;
};

function Field({ id, label, value, onChange, placeholder, error, hint, type = 'text', multiline, suffix }: FieldProps) {
  const common = { id, value, placeholder, 'aria-invalid': !!error, 'aria-describedby': error ? `${id}-error` : hint ? `${id}-hint` : undefined, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value) };
  return <div className={styles.field}>
    <label htmlFor={id}>{label}</label>
    <div className={styles.fieldControl}>
      {multiline ? <textarea {...common} className={`${styles.input} ${styles.textarea} ${error ? styles.invalid : ''}`} /> : <input {...common} type={type} className={`${styles.input} ${error ? styles.invalid : ''}`} />}
      {suffix}
    </div>
    {error && <p id={`${id}-error`} className={styles.error} role="alert">{error}</p>}
    {!error && hint && <p id={`${id}-hint`} className={styles.hint}>{hint}</p>}
  </div>;
}

export default function Generator({ type, onTypeChange, values, setValues, outcome, qrData, qrError, onRetryPreview, onSave }: Props) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showPassword, setShowPassword] = useState(false);
  const formErrors = getFormErrors(type, values);
  const showErrors = Object.keys(touched).some(field => field.startsWith(`${type}.`));
  const errorFor = (field: string) => showErrors ? formErrors[field] : undefined;
  const mark = (field: string) => setTouched(previous => ({ ...previous, [`${type}.${field}`]: true }));
  const setNested = <K extends 'wifi' | 'contact' | 'email'>(group: K, field: keyof FormValues[K], value: string) => {
    setValues(previous => ({ ...previous, [group]: { ...previous[group], [field]: value } }));
    mark(String(field));
  };
  const previewAlt = `${qrTypes.find(item => item.id === type)?.label} QR 미리보기`;
  const isBlank = type === 'url' ? values.url === '' : type === 'wifi' ? values.wifi.ssid === '' && values.wifi.password === '' : type === 'contact' ? !values.contact.familyName && !values.contact.givenName : type === 'text' ? values.text === '' : values.email.to === '';
  const showStart = isBlank && !showErrors;
  return <>
    <div className={styles.hero}>
      <h1>필요한 QR을 빠르게 만들어요</h1>
      <p>입력하면 바로 미리 볼 수 있어요. 저장하려면 GitHub 로그인이 필요해요.</p>
    </div>
    <div className={styles.columns}>
      <section className={styles.card} aria-label="QR 입력">
        <h2>어떤 QR이 필요한가요?</h2>
        <div className={styles.tabs} role="tablist" aria-label="QR 입력 유형">
          {qrTypes.map(item => <button key={item.id} type="button" role="tab" aria-selected={type === item.id} className={type === item.id ? styles.activeTab : ''} onClick={() => onTypeChange(item.id)}>{item.label}</button>)}
        </div>
        <div className={styles.fields} role="tabpanel">
          {type === 'url' && <>
            <Field id="url" label="웹 주소" placeholder="https://example.com" value={values.url} onChange={value => { setValues(previous => ({ ...previous, url: value })); mark('url'); }} error={errorFor('url')} hint="http:// 또는 https://로 시작하는 주소를 입력해 주세요." />
            <div className={styles.info}><strong>이렇게 쓸 수 있어요</strong><span>메뉴, 행사 안내, 설문, 상품 페이지 링크를 QR로 공유해 보세요.</span></div>
          </>}
          {type === 'wifi' && <>
            <Field id="ssid" label="네트워크 이름 (SSID)" placeholder="예: OFFICE_WIFI" value={values.wifi.ssid} onChange={value => setNested('wifi', 'ssid', value)} error={errorFor('ssid')} />
            <div className={styles.field}><span className={styles.label}>보안 방식</span><div className={styles.segmented}>
              <button type="button" aria-pressed={values.wifi.security === 'password'} onClick={() => setValues(previous => ({ ...previous, wifi: { ...previous.wifi, security: 'password' } }))}>비밀번호 사용</button>
              <button type="button" aria-pressed={values.wifi.security === 'open'} onClick={() => setValues(previous => ({ ...previous, wifi: { ...previous.wifi, security: 'open' } }))}>공개 네트워크</button>
            </div></div>
            {values.wifi.security === 'password' && <Field id="password" label="비밀번호" value={values.wifi.password} placeholder="와이파이 비밀번호" type={showPassword ? 'text' : 'password'} onChange={value => setNested('wifi', 'password', value)} error={errorFor('password')} suffix={<button type="button" className={styles.reveal} onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? '비밀번호 가리기' : '비밀번호 보기'}>{showPassword ? '가리기' : '보기'}</button>} />}
            <div className={styles.info}><strong>공유 전 확인해 주세요</strong><span>QR을 받은 사람은 네트워크 이름과 비밀번호를 확인할 수 있어요.</span></div>
          </>}
          {type === 'contact' && <>
            <div className={styles.nameRow}>
              <Field id="familyName" label="성" placeholder="김" value={values.contact.familyName} onChange={value => { setNested('contact', 'familyName', value); mark('name'); }} error={errorFor('name')} />
              <Field id="givenName" label="이름" placeholder="민지" value={values.contact.givenName} onChange={value => { setNested('contact', 'givenName', value); mark('name'); }} />
            </div>
            <Field id="phone" label="전화번호 · 선택" placeholder="010-1234-5678" value={values.contact.phone} onChange={value => setNested('contact', 'phone', value)} />
            <Field id="contactEmail" label="이메일 · 선택" placeholder="name@example.com" value={values.contact.email} onChange={value => setNested('contact', 'email', value)} error={errorFor('email')} />
            <Field id="organization" label="회사 · 선택" placeholder="회사 이름" value={values.contact.organization} onChange={value => setNested('contact', 'organization', value)} />
            <Field id="website" label="웹사이트 · 선택" placeholder="https://example.com" value={values.contact.website} onChange={value => setNested('contact', 'website', value)} error={errorFor('website')} />
          </>}
          {type === 'text' && <Field id="text" label="내용" placeholder="QR에 담을 내용을 입력해 주세요." value={values.text} onChange={value => { setValues(previous => ({ ...previous, text: value })); mark('text'); }} error={errorFor('text')} multiline hint="스캔하면 입력한 내용이 그대로 보여요." />}
          {type === 'email' && <>
            <Field id="to" label="받는 주소" placeholder="hello@example.com" value={values.email.to} onChange={value => setNested('email', 'to', value)} error={errorFor('to')} />
            <Field id="subject" label="제목 · 선택" placeholder="문의드립니다" value={values.email.subject} onChange={value => setNested('email', 'subject', value)} error={errorFor('subject')} />
            <Field id="body" label="본문 · 선택" placeholder="메일에 들어갈 내용을 입력해 주세요." value={values.email.body} onChange={value => setNested('email', 'body', value)} multiline />
            <p className={styles.hint}>QR을 스캔하면 메일 작성 화면이 열립니다. 메일이 자동으로 발송되지는 않아요.</p>
          </>}
        </div>
      </section>
      <section className={styles.card} aria-label="QR 미리보기">
        <h2>미리보기</h2>
        <p className={styles.cardIntro}>입력 내용이 바뀌면 QR도 바로 갱신돼요.</p>
        <div className={styles.preview} aria-live="polite">
          {qrData ? <img className={styles.qrImage} src={qrData} alt={previewAlt} /> : <div className={styles.placeholder}>
            <strong>{showStart ? '입력을 시작해 주세요' : qrError === 'capacity' ? 'QR에 담을 내용이 너무 길어요' : 'QR을 만들 수 없어요'}</strong>
            <span>{showStart ? '왼쪽 항목을 입력하면 QR이 나타나요.' : qrError === 'capacity' ? '내용을 줄이거나 웹 주소로 공유해 주세요.' : qrError === 'generation' ? 'QR을 만들지 못했어요. 다시 시도해 주세요.' : outcome.ok ? 'QR을 만드는 중이에요.' : outcome.message}</span>
            {qrError === 'generation' && <button type="button" className={styles.retry} onClick={onRetryPreview}>다시 생성</button>}
          </div>}
        </div>
        <p className={styles.previewCaption}>{qrData ? '입력한 내용을 확인한 뒤 QR을 저장해 주세요.' : '올바른 내용을 입력하면 미리보기가 나타나요.'}</p>
        <button type="button" className={styles.saveButton} disabled={!qrData || !outcome.ok} onClick={onSave}>QR 저장하기</button>
        <p className={styles.hint}>내 QR에 저장한 뒤 PNG·SVG로 다운로드할 수 있어요.</p>
      </section>
    </div>
    <p className={styles.footerNote}>QR에는 입력한 내용이 그대로 담겨요. 공유 전 내용을 확인해 주세요.</p>
  </>;
}
