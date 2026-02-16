import React from 'react';

import styles from './SortableHeaderButton.module.css';

type SortDirection = 'asc' | 'desc';

interface SortableHeaderButtonProps {
  label: string;
  isActive: boolean;
  direction: SortDirection;
  onClick: () => void;
}

export default function SortableHeaderButton({
  label,
  isActive,
  direction,
  onClick
}: SortableHeaderButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.sortButton} ${isActive ? styles.sortActive : ''}`}
      onClick={onClick}
    >
      {label}
      <span className={styles.sortIndicator}>
        {isActive ? (direction === 'asc' ? '▲' : '▼') : ''}
      </span>
    </button>
  );
}
