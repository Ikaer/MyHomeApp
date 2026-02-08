import React, { ReactNode, useEffect, useId } from 'react';
import styles from './Modal.module.css';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

interface ModalProps {
  open: boolean;
  title?: string;
  headerContent?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  size?: ModalSize;
  showCloseButton?: boolean;
  closeLabel?: string;
  closeOnOverlayClick?: boolean;
  bodyClassName?: string;
}

export default function Modal({
  open,
  title,
  headerContent,
  footer,
  onClose,
  children,
  size = 'md',
  showCloseButton = true,
  closeLabel = 'Close',
  closeOnOverlayClick = true,
  bodyClassName = ''
}: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass =
    size === 'sm'
      ? styles.sizeSm
      : size === 'lg'
      ? styles.sizeLg
      : size === 'xl'
      ? styles.sizeXl
      : styles.sizeMd;

  return (
    <div
      className={styles.overlay}
      onClick={closeOnOverlayClick ? onClose : undefined}
      role="presentation"
    >
      <div
        className={`${styles.content} ${sizeClass}`}
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
      >
        {(title || headerContent || showCloseButton) && (
          <div className={styles.header}>
            <div className={styles.titleBlock}>
              {title && (
                <h2 className={styles.title} id={titleId}>
                  {title}
                </h2>
              )}
              {headerContent && (
                <div className={styles.headerContent}>{headerContent}</div>
              )}
            </div>
            {showCloseButton && (
              <button
                type="button"
                className={styles.closeButton}
                onClick={onClose}
              >
                {closeLabel}
              </button>
            )}
          </div>
        )}
        <div className={`${styles.body} ${bodyClassName}`}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}
