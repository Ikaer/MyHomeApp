import React from 'react';
import styles from './AnimeSidebar.module.css';
import { MALAuthState, UserAnimeStatus, AnimeView, ImageSize, VisibleColumns, StatsColumn } from '@/models/anime';

const ALL_STATUSES: (UserAnimeStatus | 'not_defined')[] = ["watching", "completed", "on_hold", "dropped", "plan_to_watch", "not_defined"];

const ALL_VIEWS: Array<{ key: AnimeView; label: string; description: string }> = [
    { key: 'new_season_strict', label: 'New Season (Strict)', description: 'Animes from the current season only' },
    { key: 'new_season', label: 'New Season', description: 'Current & previous season still airing' },
    { key: 'next_season', label: 'Next Season', description: 'Animes that will air in the next season' },
    { key: 'find_shows', label: 'Find Shows', description: 'Top 100 highest-rated TV shows not in your list' },
    { key: 'watching', label: 'Watching', description: 'Currently watching on MyAnimeList' },
    { key: 'completed', label: 'Completed', description: 'Completed on MyAnimeList' },
    { key: 'on_hold', label: 'On Hold', description: 'Shows currently on hold' },
    { key: 'dropped', label: 'Dropped', description: 'Shows you have dropped' },
    { key: 'plan_to_watch', label: 'Plan to Watch', description: 'Shows you plan to watch in the future' },
    { key: 'hidden', label: 'Hidden', description: 'Shows you have hidden from other views' }
];

interface AnimeSidebarProps {
  // Auth
  authState: MALAuthState;
  isAuthLoading: boolean;
  authError: string;
  onConnect: () => void;
  onDisconnect: () => void;

  // Sync
  isSyncing: boolean;
  isBigSyncing: boolean;
  syncError: string;
  onSync: () => void;
  onBigSync: () => void;

  // View
  currentView: AnimeView;
  onViewChange: (view: AnimeView) => void;

  // Display
  imageSize: ImageSize;
  onImageSizeChange: (size: ImageSize) => void;

  // Filters
  statusFilters: (UserAnimeStatus | 'not_defined')[];
  onStatusFilterChange: (status: UserAnimeStatus | 'not_defined', isChecked: boolean) => void;

  // Stats
  animeCount: number;
  evolutionPeriod: string;
  onEvolutionPeriodChange: (period: string) => void;
  visibleColumns: VisibleColumns;
  onVisibleColumnsChange: (column: StatsColumn, isVisible: boolean) => void;
}

const AnimeSidebar: React.FC<AnimeSidebarProps> = ({
  authState, isAuthLoading, authError, onConnect, onDisconnect,
  isSyncing, isBigSyncing, syncError, onSync, onBigSync,
  currentView, onViewChange,
  imageSize, onImageSizeChange,
  statusFilters, onStatusFilterChange,
  animeCount, evolutionPeriod, onEvolutionPeriodChange,
  visibleColumns, onVisibleColumnsChange,
}) => {
  return (
    <div className={styles.sidebar}>
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Account</h2>
        {isAuthLoading ? (
          <button disabled className={styles.button}>Loading...</button>
        ) : authState.isAuthenticated ? (
          <div className={styles.connectedAccount}>
            <span>Connected as <strong>{authState.user?.name}</strong></span>
            <button onClick={onDisconnect} className={`${styles.button} ${styles.disconnectButton}`}>
              Disconnect
            </button>
          </div>
        ) : (
          <button onClick={onConnect} className={`${styles.button} ${styles.connectButton}`}>
            Connect to MyAnimeList
          </button>
        )}
        {authError && <div className={styles.error}>{authError}</div>}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Sync</h2>
        <div className={styles.buttonGroup}>
            <button onClick={onSync} disabled={!authState.isAuthenticated || isSyncing || isBigSyncing} className={styles.button}>
            {isSyncing ? 'Syncing...' : 'Sync Data'}
            </button>
            <button onClick={onBigSync} disabled={!authState.isAuthenticated || isSyncing || isBigSyncing} className={`${styles.button} ${styles.disconnectButton}`}>
            {isBigSyncing ? 'Big Syncing...' : 'Big Sync'}
            </button>
        </div>
        {syncError && <div className={styles.error}>{syncError}</div>}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Views</h2>
        <div className={styles.viewList}>
            {ALL_VIEWS.map(view => (
                <button
                    key={view.key}
                    className={`${styles.viewButton} ${currentView === view.key ? styles.activeView : ''}`}
                    onClick={() => onViewChange(view.key)}
                    title={view.description}
                >
                    {view.label}
                </button>
            ))}
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Display</h2>
        <div className={styles.displayOptions}>
          <label className={styles.displayLabel}>Image Size:</label>
          <div className={styles.imageSizeButtons}>
            <button
              className={`${styles.sizeButton} ${imageSize === 1 ? styles.activeSizeButton : ''}`}
              onClick={() => onImageSizeChange(1)}
            >
              x1
            </button>
            <button
              className={`${styles.sizeButton} ${imageSize === 2 ? styles.activeSizeButton : ''}`}
              onClick={() => onImageSizeChange(2)}
            >
              x2
            </button>
            <button
              className={`${styles.sizeButton} ${imageSize === 3 ? styles.activeSizeButton : ''}`}
              onClick={() => onImageSizeChange(3)}
            >
              x3
            </button>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Filters</h2>
        <div className={styles.filterGroup}>
          {ALL_STATUSES.map((status) => (
            <label key={status} className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={statusFilters.includes(status)}
                onChange={(e) => onStatusFilterChange(status, e.target.checked)}
              />
              {status === 'not_defined' ? 'No Status' : status.replace(/_/g, ' ')}
            </label>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Stats</h2>
        <div className={styles.statsContainer}>
          <span>Total Anime: {animeCount}</span>
          <div className={styles.evolutionSelector}>
            <label htmlFor="evolution-period">Evolution:</label>
            <select
              id="evolution-period"
              value={evolutionPeriod}
              onChange={(e) => onEvolutionPeriodChange(e.target.value)}
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
      </div>
    </div>
  );
};

export default AnimeSidebar;