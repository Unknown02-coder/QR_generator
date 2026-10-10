import type { QrInput } from '../qr/payload.js';
import styles from '../App.module.css';

type Props = { input: QrInput; errors: Record<string, string>; onChange: (field: string, value: string) => void; visible: boolean; onToggle: () => void };

export function QrForm({ input, errors, onChange, visible, onToggle }: Props) {
  const field = (name: string, label: string, value: string, options: { multiline?: boolean; type?: string; placeholder?: string; autocomplete?: string } = {}) => {
    const id = `${input.type}-${name}`;
    const props = { id, name, value, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(name, event.target.value), 'aria-invalid': Boolean(errors[name]), 'aria-describedby': errors[name] ? `${id}-error` : undefined, autoComplete: options.autocomplete || 'off', placeholder: options.placeholder };
    return <div className={styles.field} key={name}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.inputWrap}>
        {options.multiline ? <textarea {...props} rows={name === 'text' ? 8 : 5} /> : <input {...props} type={options.type || 'text'} />}
        {input.type === 'WIFI' && name === 'password' && <button className={styles.toggle} type="button" onClick={onToggle} aria-label={visible ? '비밀번호 가리기' : '비밀번호 보기'} aria-pressed={visible}>{visible ? '가리기' : '보기'}</button>}
      </div>
      {errors[name] && <p id={`${id}-error`} className={styles.fieldError} aria-live="polite">{errors[name]}</p>}
    </div>;
  };

  switch (input.type) {
    case 'URL': return <>
      {field('url', '웹 주소', input.url, { placeholder: 'https://example.com' })}
      <p className={styles.hint}>http:// 또는 https://로 시작하는 주소를 입력해 주세요.</p>
      <div className={styles.tip}><strong>이렇게 쓸 수 있어요</strong><p>메뉴, 행사 안내, 설문, 상품 페이지 링크를 QR로 공유해 보세요.</p></div>
    </>;
    case 'WIFI': return <>
      {field('ssid', '네트워크 이름', input.ssid, { placeholder: '집_와이파이' })}
      <fieldset className={styles.security}><legend>보안 방식</legend>
        <label><input type="radio" name="security" value="WPA" checked={input.security === 'WPA'} onChange={() => onChange('security', 'WPA')} />비밀번호 사용</label>
        <label><input type="radio" name="security" value="nopass" checked={input.security === 'nopass'} onChange={() => onChange('security', 'nopass')} />공개 네트워크</label>
      </fieldset>
      {input.security === 'WPA' && field('password', '비밀번호', input.password, { type: visible ? 'text' : 'password', autocomplete: 'new-password' })}
      <p className={styles.hint}>QR을 받은 사람은 네트워크 이름과 비밀번호를 확인할 수 있어요.</p>
      <div className={styles.tip}><strong>공유 전 확인해 주세요</strong><p>연결할 네트워크의 이름과 비밀번호를 그대로 입력해 주세요.</p></div>
    </>;
    case 'CONTACT': return <>
      <div className={styles.nameFields}>{field('familyName', '성', input.familyName)}{field('givenName', '이름', input.givenName)}</div>
      {field('phone', '전화번호', input.phone, { type: 'tel' })}
      {field('email', '이메일', input.email, { type: 'email' })}
      {field('company', '회사', input.company)}
      {field('website', '웹사이트', input.website, { placeholder: 'https://example.com' })}
      <p className={styles.hint}>성과 이름 중 하나만 입력해도 QR을 만들 수 있어요.</p>
    </>;
    case 'TEXT': return <>{field('text', '내용', input.text, { multiline: true, placeholder: 'QR에 담을 내용을 입력해 주세요.' })}<p className={styles.hint}>입력한 내용이 그대로 QR에 담겨요.</p></>;
    case 'EMAIL': return <>
      {field('recipient', '받는 이메일', input.recipient, { type: 'email', placeholder: 'hello@example.com' })}
      {field('subject', '제목', input.subject)}
      {field('body', '본문', input.body, { multiline: true })}
      <p className={styles.hint}>QR을 스캔하면 메일 작성 화면이 열려요. 메일이 자동으로 발송되지는 않아요.</p>
    </>;
  }
}
