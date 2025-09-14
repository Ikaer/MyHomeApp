import { AnimeView } from '@/models/anime';
import styles from './AnimeViewSelector.module.css';

interface AnimeViewSelectorProps {
  currentView: AnimeView;
  onViewChange: (view: AnimeView) => void;
  animeCount?: number;
  isLoading?: boolean;
}

export default function AnimeViewSelector({ currentView, onViewChange, animeCount, isLoading }: AnimeViewSelectorProps) {
  const views: Array<{ key: AnimeView; label: string; description: string }> = [
    {
      key: 'new_season',
      label: 'New Season',
      description: 'Current & previous season still airing'
    },
    {
      key: 'find_shows',
      label: 'Find Shows',
      description: 'Top 100 highest-rated TV shows not in your list'
    },
    {
      key: 'watching',
      label: 'Watching',
      description: 'Currently watching on MyAnimeList'
    },
    {
      key: 'completed',
      label: 'Completed',
      description: 'Completed on MyAnimeList'
    },
    {
      key: 'on_hold',
      label: 'On Hold',
      description: 'Shows currently on hold'
    },
    {
      key: 'dropped',
      label: 'Dropped',
      description: 'Shows you have dropped'
    },
    {
      key: 'plan_to_watch',
      label: 'Plan to Watch',
      description: 'Shows you plan to watch in the future'
    },
    {
      key: 'hidden',
      label: 'Hidden',
      description: 'Shows you have hidden from other views'
    }
  ];

  return (
    <div className={styles.viewSelector}>
      <div className={styles.viewTabs}>
        {views.map(view => (
          <button
            key={view.key}
            className={`${styles.viewTab} ${currentView === view.key ? styles.active : ''}`}
            onClick={() => onViewChange(view.key)}
            title={view.description}
            disabled={isLoading}
          >
            <span className={styles.viewLabel}>{view.label}</span>
          </button>
        ))}
      </div>
      
      <div className={styles.statusSection}>
        {isLoading ? (
          <div className={styles.loadingIndicator}>
            <span className={styles.spinner}></span>
            Loading...
          </div>
        ) : animeCount !== undefined ? (
          <div className={styles.animeCount}>
            {animeCount} anime{animeCount !== 1 ? 's' : ''}
          </div>
        ) : null}
      </div>
    </div>
  );
}
