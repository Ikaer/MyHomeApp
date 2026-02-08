import React from 'react';
import styles from '@/styles/savings.module.css';

interface AnnualEditorModalProps {
  open: boolean;
  year: number | null;
  endValue: string;
  currency: string;
  onChangeEndValue: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export default function AnnualEditorModal({
  open,
  year,
  endValue,
  currency,
  onChangeEndValue,
  onClose,
  onSave
}: AnnualEditorModalProps) {
  if (!open || year === null) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={event => event.stopPropagation()}>
        <h2 className={styles.accountName}>Annual Overview</h2>
        <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
          <label className={styles.label}>Year</label>
          <input
            type="text"
            className={styles.input}
            value={year}
            readOnly
          />
        </div>
        <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
          <label className={styles.label}>End of Year Value ({currency})</label>
          <input
            type="number"
            step="any"
            className={styles.input}
            value={endValue}
            onChange={event => onChangeEndValue(event.target.value)}
            placeholder="e.g. 12500.45"
          />
        </div>
        <div className={styles.formActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={styles.button} onClick={onSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
