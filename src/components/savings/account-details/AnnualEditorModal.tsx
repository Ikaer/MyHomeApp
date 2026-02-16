import React from 'react';
import { Button, Modal } from '@/components/shared';
import sharedStyles from '@/components/savings/SavingsShared.module.css';

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
  return (
    <Modal
      open={open && year !== null}
      title="Annual Overview"
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={onSave}>
            Save
          </Button>
        </>
      }
    >
      <div className={sharedStyles.formGroup}>
        <label className={sharedStyles.label}>Year</label>
        <input
          type="text"
          className={sharedStyles.input}
          value={year ?? ''}
          readOnly
        />
      </div>
      <div className={sharedStyles.formGroup}>
        <label className={sharedStyles.label}>End of Year Value ({currency})</label>
        <input
          type="number"
          step="any"
          className={sharedStyles.input}
          value={endValue}
          onChange={event => onChangeEndValue(event.target.value)}
          placeholder="e.g. 12500.45"
        />
      </div>
    </Modal>
  );
}
