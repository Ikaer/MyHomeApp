import React from 'react';
import styles from './StatsSection.module.css';
import { VisibleColumns, StatsColumn } from '@/models/anime';

interface StatsSectionProps {
  animeCount: number;
  evolutionPeriod: string;
  onEvolutionPeriodChange: (period: string) => void;
  visibleColumns: VisibleColumns;
  onVisibleColumnsChange: (column: StatsColumn, isVisible: boolean) => void;
}

const StatsSection: React.FC<StatsSectionProps> = ({
  animeCount,
  evolutionPeriod,
  onEvolutionPeriodChange,
  visibleColumns,
  onVisibleColumnsChange,
}) => {
  return (
    <div className={styles.statsSection}>
      <span className={styles.animeCount}>Total Anime: {animeCount}</span>
      
      <div className={styles.evolutionSelector}>
        <label htmlFor="evolution-period">Evolution:</label>
        <select
          id="evolution-period"
          value={evolutionPeriod}
          onChange={(e) => onEvolutionPeriodChange(e.target.value)}
          className={styles.select}
        >
          <option value="1w">1 Week</option>
          <option value="1m">1 Month</option>
          <option value="3m">3 Months</option>
          <option value="1y">1 Year</option>
        </select>
      </div>
      
      <div className={styles.columnsVisibility}>
        <label className={styles.columnsLabel}>Visible Columns:</label>
        <div className={styles.columnCheckboxes}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={visibleColumns?.score ?? true}
              onChange={(e) => onVisibleColumnsChange('score', e.target.checked)}
            />
            Score
          </label>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={visibleColumns?.scoreDelta ?? true}
              onChange={(e) => onVisibleColumnsChange('scoreDelta', e.target.checked)}
            />
            Score Δ
          </label>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={visibleColumns?.rank ?? true}
              onChange={(e) => onVisibleColumnsChange('rank', e.target.checked)}
            />
            Rank
          </label>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={visibleColumns?.rankDelta ?? true}
              onChange={(e) => onVisibleColumnsChange('rankDelta', e.target.checked)}
            />
            Rank Δ
          </label>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={visibleColumns?.popularity ?? true}
              onChange={(e) => onVisibleColumnsChange('popularity', e.target.checked)}
            />
            Popularity
          </label>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={visibleColumns?.popularityDelta ?? true}
              onChange={(e) => onVisibleColumnsChange('popularityDelta', e.target.checked)}
            />
            Popularity Δ
          </label>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={visibleColumns?.users ?? true}
              onChange={(e) => onVisibleColumnsChange('users', e.target.checked)}
            />
            Users
          </label>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={visibleColumns?.usersDelta ?? true}
              onChange={(e) => onVisibleColumnsChange('usersDelta', e.target.checked)}
            />
            Users Δ
          </label>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={visibleColumns?.scorers ?? true}
              onChange={(e) => onVisibleColumnsChange('scorers', e.target.checked)}
            />
            Scorers
          </label>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={visibleColumns?.scorersDelta ?? true}
              onChange={(e) => onVisibleColumnsChange('scorersDelta', e.target.checked)}
            />
            Scorers Δ
          </label>
        </div>
      </div>
    </div>
  );
};

export default StatsSection;
