import { useEffect, useRef, type ReactNode } from 'react';
import styles from './Dialog.module.css';

type Props = { title: string; description?: string; children: ReactNode; onClose: () => void; wide?: boolean };

export default function Dialog({ title, description, children, onClose, wide = false }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const previousFocus = document.activeElement;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
      if (event.key !== 'Tab') return;
      const controls = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled)') ?? [])];
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);
  return <div className={styles.backdrop} onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} className={`${styles.dialog} ${wide ? styles.wide : ''}`} role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby={description ? 'dialog-description' : undefined}>
      <button ref={closeRef} className={styles.close} type="button" aria-label="닫기" onClick={onClose}>×</button>
      <h2 id="dialog-title">{title}</h2>
      {description && <p id="dialog-description" className={styles.description}>{description}</p>}
      {children}
    </section>
  </div>;
}
