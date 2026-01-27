import React from 'react';
import styles from './AnimeSidebar.module.css';
import { MALAuthState, UserAnimeStatus, ImageSize, VisibleColumns, StatsColumn, SortColumn, SortDirection, AnimeLayoutType } from '@/models/anime';
import { SeasonInfo } from './SeasonSelector';
import { CollapsibleSection } from '@/components/shared';
import {
  SortOrderSection,
  AccountSection,
  DataSyncSection,
  ViewsSection,
  DisplaySection,
  FiltersSection,
  StatsSection
} from './sidebar';

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

  // Display
  imageSize: ImageSize;
  onImageSizeChange: (size: ImageSize) => void;

  // Filters
  statusFilters: (UserAnimeStatus | 'not_defined')[];
  onStatusFilterChange: (status: UserAnimeStatus | 'not_defined', isChecked: boolean) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  seasons: SeasonInfo[];
  onSeasonsChange: (v: SeasonInfo[]) => void;
  mediaTypes: string[];
  onMediaTypesChange: (v: string[]) => void;
  hiddenOnly: boolean;
  onHiddenOnlyChange: (v: boolean) => void;
  minScore: number | null;
  onMinScoreChange: (v: number | null) => void;
  maxScore: number | null;
  onMaxScoreChange: (v: number | null) => void;

  // Stats
  animeCount: number;
  visibleColumns: VisibleColumns;
  onVisibleColumnsChange: (column: StatsColumn, isVisible: boolean) => void;

  // Sidebar UI state
  sidebarExpanded: Record<string, boolean>;
  onSidebarExpandedChange: (section: string, isExpanded: boolean) => void;

  // Sort
  sortBy: SortColumn;
  sortDir: SortDirection;
  onSortByChange: (c: SortColumn) => void;
  onSortDirChange: (d: SortDirection) => void;

  // Layout
  layout: AnimeLayoutType;
  onLayoutChange: (l: AnimeLayoutType) => void;
}

const AnimeSidebar: React.FC<AnimeSidebarProps> = ({
  authState, isAuthLoading, authError, onConnect, onDisconnect,
  isSyncing, isBigSyncing, syncError, onSync, onBigSync,
  imageSize, onImageSizeChange,
  statusFilters, onStatusFilterChange,
  searchQuery, onSearchChange,
  seasons, onSeasonsChange,
  mediaTypes, onMediaTypesChange,
  hiddenOnly, onHiddenOnlyChange,
  minScore, onMinScoreChange,
  maxScore, onMaxScoreChange,
  animeCount,
  visibleColumns, onVisibleColumnsChange,
  sidebarExpanded, onSidebarExpandedChange,
  sortBy, sortDir, onSortByChange, onSortDirChange,
  layout, onLayoutChange,
}) => {
  // Section toggle now uses URL state
  const toggle = (key: string) => {
    onSidebarExpandedChange(key, !sidebarExpanded[key]);
  };

  return (
    <div className={styles.sidebar}>
      <div className={styles.topRow}>
        <input
          type="text"
          placeholder="Search anime..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={styles.searchInput}
        />
        <div className={styles.layoutSelector}>
          <button
            className={`${styles.layoutBtn} ${layout === 'table' ? styles.active : ''}`}
            onClick={() => onLayoutChange('table')}
            title="Table View"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="9" x2="9" y2="21" /><line x1="15" y1="9" x2="15" y2="21" /></svg>
          </button>
          <button
            className={`${styles.layoutBtn} ${layout === 'card' ? styles.active : ''}`}
            onClick={() => onLayoutChange('card')}
            title="Card View"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg>
          </button>
        </div>
      </div>

      <CollapsibleSection
        title="Account"
        isExpanded={sidebarExpanded.account}
        onToggle={() => toggle('account')}
      >
        <AccountSection
          authState={authState}
          isAuthLoading={isAuthLoading}
          authError={authError}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Data Sync"
        isExpanded={sidebarExpanded.sync}
        onToggle={() => toggle('sync')}
      >
        <DataSyncSection
          authState={authState}
          isSyncing={isSyncing}
          isBigSyncing={isBigSyncing}
          syncError={syncError}
          onSync={onSync}
          onBigSync={onBigSync}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Views"
        isExpanded={sidebarExpanded.views}
        onToggle={() => toggle('views')}
      >
        <ViewsSection />
      </CollapsibleSection>

      <CollapsibleSection
        title="Display"
        isExpanded={sidebarExpanded.display}
        onToggle={() => toggle('display')}
      >
        <DisplaySection
          imageSize={imageSize}
          onImageSizeChange={onImageSizeChange}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Filters"
        isExpanded={sidebarExpanded.filters}
        onToggle={() => toggle('filters')}
      >
        <FiltersSection
          statusFilters={statusFilters}
          onStatusFilterChange={onStatusFilterChange}
          seasons={seasons}
          onSeasonsChange={onSeasonsChange}
          mediaTypes={mediaTypes}
          onMediaTypesChange={onMediaTypesChange}
          hiddenOnly={hiddenOnly}
          onHiddenOnlyChange={onHiddenOnlyChange}
          minScore={minScore}
          onMinScoreChange={onMinScoreChange}
          maxScore={maxScore}
          onMaxScoreChange={onMaxScoreChange}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Sort & Order"
        isExpanded={sidebarExpanded.sort}
        onToggle={() => toggle('sort')}
      >
        <SortOrderSection
          sortBy={sortBy}
          sortDir={sortDir}
          onSortByChange={onSortByChange}
          onSortDirChange={onSortDirChange}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Stats"
        isExpanded={sidebarExpanded.stats}
        onToggle={() => toggle('stats')}
      >
        <StatsSection
          animeCount={animeCount}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={onVisibleColumnsChange}
        />
      </CollapsibleSection>
    </div>
  );
};

export default AnimeSidebar;