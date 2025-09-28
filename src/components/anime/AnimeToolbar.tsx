import React from 'react';
import styles from './AnimeToolbar.module.css';
import { UserAnimeStatus } from '@/models/anime';

const ALL_STATUSES: (UserAnimeStatus | 'not_defined')[] = ["watching", "completed", "on_hold", "dropped", "plan_to_watch", "not_defined"];

interface AnimeToolbarProps {
  scoreEvolutionPeriod: number;
  onScoreEvolutionPeriodChange: (period: number) => void;
  statusFilters: (UserAnimeStatus | 'not_defined')[];
  onStatusFiltersChange: (statuses: (UserAnimeStatus | 'not_defined')[]) => void;
}

export default function AnimeToolbar({ scoreEvolutionPeriod, onScoreEvolutionPeriodChange, statusFilters, onStatusFiltersChange }: AnimeToolbarProps) {
  
  const handleStatusChange = (status: UserAnimeStatus | 'not_defined', isChecked: boolean) => {
    const newFilters = isChecked
      ? [...statusFilters, status]
      : statusFilters.filter((s) => s !== status);
    onStatusFiltersChange(newFilters);
  };

  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarLeft}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Status:</span>
          {ALL_STATUSES.map((status) => (
            <label key={status} className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={statusFilters.includes(status)}
                onChange={(e) => handleStatusChange(status, e.target.checked)}
              />
              {status === 'not_defined' ? 'No status' : status.replace(/_/g, ' ')}
            </label>
          ))}
        </div>
      </div>
      <div className={styles.toolbarRight}>
        <div className={styles.evolutionSelectorContainer}>
          <label htmlFor="evolution-period">Evolution Period:</label>
          <select
            id="evolution-period"
            value={scoreEvolutionPeriod}
            onChange={(e) => onScoreEvolutionPeriodChange(Number(e.target.value))}
            className={styles.evolutionPeriodSelector}
            title="Select evolution period"
          >
            {[1, 2, 4, 8, 12, 24, 52].map(w => <option key={w} value={w}>{w}w</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
