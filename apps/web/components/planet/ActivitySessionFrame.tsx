'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import styles from '../science/ScienceSession.module.css';

export type ActivitySessionFrameProps = {
  open: boolean;
  name: string;
  onClose: () => void;
  children: ReactNode;
};

export function ActivitySessionFrame({ open, name, onClose, children }: ActivitySessionFrameProps) {
  const root = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);

  useEffect(() => { close.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open || !root.current) return;
    const element = root.current;
    const previous = document.activeElement as HTMLElement | null;
    // The universe remains mounted underneath a session, so trap focus in the
    // activity controls rather than including its map and exploration buttons.
    const controls = () => element.querySelector<HTMLElement>('[data-session-controls]') ?? element;
    const focusables = () => Array.from(controls().querySelectorAll<HTMLElement>('button:not(:disabled), [href], input, select, textarea, [tabindex="0"]')).filter(item => !item.closest('[hidden], [inert]') && item.getClientRects().length > 0);
    (focusables()[0] ?? element).focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close.current(); }
      if (event.key !== 'Tab') return;
      const items = focusables(); const first = items[0]; const last = items[items.length - 1];
      if (!first) { event.preventDefault(); element.focus(); }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === element)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    element.addEventListener('keydown', key);
    return () => {
      element.removeEventListener('keydown', key);
      const restore = () => {
        if (previous?.isConnected && previous !== document.body && previous !== element && !previous.closest('[inert]')) previous.focus();
        else Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent === `Explore ${name}`)?.focus();
      };
      queueMicrotask(restore);
    };
  }, [open, name]);

  return <div ref={root} className={styles.worldFrame} role={open ? 'dialog' : undefined} aria-modal={open ? true : undefined} aria-label={open ? `${name} activity session` : undefined} tabIndex={open ? -1 : undefined} data-session-open={open}>{children}</div>;
}
