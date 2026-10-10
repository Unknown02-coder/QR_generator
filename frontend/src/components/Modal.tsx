import { useEffect, useRef, type ReactNode } from 'react';
import styles from '../App.module.css';

export function Modal({ titleId, descriptionId, children, onClose, className = '' }: { titleId: string; descriptionId?: string; children: ReactNode; onClose: () => void; className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current!;
    element.showModal();
    return () => { element.close(); if (previous?.isConnected) previous.focus(); };
  }, []);
  return <dialog ref={dialog} className={`${styles.dialog} ${className}`} aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={event => { event.preventDefault(); onClose(); }}>{children}</dialog>;
}
