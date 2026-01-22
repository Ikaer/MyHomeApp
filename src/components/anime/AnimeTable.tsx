import React, { useMemo, useState } from 'react';
import { AnimeWithExtensions, SortColumn, SortDirection, ImageSize, VisibleColumns } from '@/models/anime';
import { detectProviderFromUrl, getProviderLogoPath, generateGoogleORQuery, generateJustWatchQuery } from '@/lib/providers';
import { formatSeason } from '@/lib/animeUtils';
import styles from './AnimeTable.module.css';

const formatNumber = (num?: number) => {
  if (num === undefined) return 'N/A';
  if (Math.abs(num) >= 10000) {
    return `${Math.round(num / 1000)}k`;
  }
  if (Number.isInteger(num)) {
    return num.toString();
  }
  return num.toFixed(2);
};

interface MALStatusUpdate {
  status?: string;
  score?: number;
  num_episodes_watched?: number;
}

interface AnimeTableProps {
  animes: AnimeWithExtensions[];
  imageSize: ImageSize;
  visibleColumns: VisibleColumns;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onUpdateMALStatus?: (animeId: number, updates: MALStatusUpdate) => void;
  onHideToggle?: (animeId: number, hide: boolean) => void;
}

export default function AnimeTable({ animes, imageSize, visibleColumns, sortColumn, sortDirection, onUpdateMALStatus, onHideToggle }: AnimeTableProps) {
  const [pendingUpdates, setPendingUpdates] = useState<Map<number, MALStatusUpdate>>(new Map());

  const sortedAnimes = useMemo(() => {
    const sorted = [...animes].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'mean':
          aValue = a.mean || 0;
          bValue = b.mean || 0;
          break;
        case 'start_date':
          aValue = a.start_date ? new Date(a.start_date).getTime() : 0;
          bValue = b.start_date ? new Date(b.start_date).getTime() : 0;
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'num_episodes':
          aValue = a.num_episodes || 0;
          bValue = b.num_episodes || 0;
          break;
        case 'rank':
          aValue = a.rank || Infinity;
          bValue = b.rank || Infinity;
          break;
        case 'popularity':
          aValue = a.popularity || Infinity;
          bValue = b.popularity || Infinity;
          break;
        case 'num_list_users':
          aValue = a.num_list_users || 0;
          bValue = b.num_list_users || 0;
          break;
        case 'num_scoring_users':
          aValue = a.num_scoring_users || 0;
          bValue = b.num_scoring_users || 0;
          break;
        default:
          aValue = a.mean || 0;
          bValue = b.mean || 0;
      }

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  }, [animes, sortColumn, sortDirection]);

  // Sorting is controlled by parent via props; no header click sorting here.

  const handleManualSearch = (anime: AnimeWithExtensions) => {
    const searchTitle = anime.alternative_titles?.en || anime.title;
    const googleUrl = generateGoogleORQuery(searchTitle);
    window.open(googleUrl, '_blank');
  };

  const handleJustWatchSearch = (anime: AnimeWithExtensions) => {
    const searchTitle = anime.alternative_titles?.en || anime.title;
    const justWatchUrl = generateJustWatchQuery(searchTitle);
    window.open(justWatchUrl, '_blank');
  };

  const updateMALStatus = (animeId: number, field: keyof MALStatusUpdate, value: any) => {
    const currentUpdates = pendingUpdates.get(animeId) || {};
    const newUpdates = { ...currentUpdates, [field]: value };

    const newPendingUpdates = new Map(pendingUpdates);
    newPendingUpdates.set(animeId, newUpdates);
    setPendingUpdates(newPendingUpdates);
  };

  const handleStatusChange = (animeId: number, status: string) => {
    updateMALStatus(animeId, 'status', status);
  };

  const handleScoreChange = (animeId: number, score: number) => {
    updateMALStatus(animeId, 'score', score);
  };

  const handleEpisodeChange = (animeId: number, episodes: number) => {
    updateMALStatus(animeId, 'num_episodes_watched', Math.max(0, episodes));
  };

  const handleUpdateMAL = async (animeId: number) => {
    const updates = pendingUpdates.get(animeId);
    if (!updates || !onUpdateMALStatus) return;

    try {
      await onUpdateMALStatus(animeId, updates);
      // Remove from pending updates after successful update
      const newPendingUpdates = new Map(pendingUpdates);
      newPendingUpdates.delete(animeId);
      setPendingUpdates(newPendingUpdates);
    } catch (error) {
      console.error('Failed to update MAL status:', error);
    }
  };

  const getDisplayStatus = (anime: AnimeWithExtensions) => {
    const updates = pendingUpdates.get(anime.id);
    return updates?.status ?? anime.my_list_status?.status ?? '';
  };

  const getDisplayScore = (anime: AnimeWithExtensions) => {
    const updates = pendingUpdates.get(anime.id);
    return updates?.score ?? anime.my_list_status?.score ?? 0;
  };

  const getDisplayEpisodes = (anime: AnimeWithExtensions) => {
    const updates = pendingUpdates.get(anime.id);
    return updates?.num_episodes_watched ?? anime.my_list_status?.num_episodes_watched ?? 0;
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'watching':
        return styles.watching;
      case 'completed':
        return styles.completed;
      case 'on_hold':
        return styles.onHold;
      case 'dropped':
        return styles.dropped;
      case 'plan_to_watch':
        return styles.planToWatch;
      default:
        return '';
    }
  };

  const hasPendingUpdates = (animeId: number) => {
    return pendingUpdates.has(animeId);
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return '';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const formatScore = (score?: number) => {
    return score ? score.toFixed(2) : 'N/A';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getEnglishTitle = (anime: AnimeWithExtensions) => {
    return anime.alternative_titles?.en || anime.title;
  };

  const formatStatus = (status?: string) => {
    if (!status) return 'Unknown';
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatGenres = (genres: Array<{ name: string }> = []) => {
    if (!genres || genres.length === 0) return 'No genres';
    // Show full genre list without suffix abbreviation
    return genres.map(g => g.name).join(', ');
  };

  const formatProviders = (anime: AnimeWithExtensions) => {
    if (!anime.extensions?.providers || anime.extensions.providers.length === 0) {
      return <span className={styles.noProviders}>No providers</span>;
    }

    return (
      <div className={styles.providersList}>
        {anime.extensions.providers.map((provider, index) => {
          const detectedProvider = detectProviderFromUrl(provider.url);
          return detectedProvider ? (
            <a
              key={index}
              href={provider.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.providerLink}
              title={`Watch on ${detectedProvider.name}`}
            >
              <img
                src={getProviderLogoPath(detectedProvider)}
                alt={detectedProvider.name}
                className={styles.providerLogo}
              />
            </a>
          ) : (
            <a
              key={index}
              href={provider.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.providerLinkText}
              title={`Watch on ${provider.name}`}
            >
              {provider.name}
            </a>
          );
        })}
      </div>
    );
  };

  const renderMetric = (
    anime: AnimeWithExtensions,
    metric: 'rank' | 'popularity' | 'num_list_users' | 'num_scoring_users' | 'mean'
  ) => {
    let latestValue: number | undefined;
    switch (metric) {
      case 'rank': latestValue = anime.rank; break;
      case 'popularity': latestValue = anime.popularity; break;
      case 'num_list_users': latestValue = anime.num_list_users; break;
      case 'num_scoring_users': latestValue = anime.num_scoring_users; break;
      case 'mean': latestValue = anime.mean; break;
    }

    let formattedValue;
    if (latestValue === undefined) {
      formattedValue = 'N/A';
    } else if (metric === 'mean') {
      formattedValue = formatScore(latestValue);
    } else if (metric === 'rank' || metric === 'popularity') {
      formattedValue = `#${formatNumber(latestValue)}`;
    } else {
      formattedValue = formatNumber(latestValue);
    }
    return <span>{formattedValue}</span>;
  }



  if (animes.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No anime found. Try syncing data or adjusting your filters.</p>
      </div>
    );
  }

  return (
    <div className={styles.animeTableContainer}>
      <div className={styles.tableWrapper}>
        <table className={styles.animeTable}>
          <thead>
            <tr>
              <th>Image</th>
              <th>Title {getSortIcon('title')}</th>
              <th>Status {getSortIcon('status')}</th>
              <th>Episodes {getSortIcon('num_episodes')}</th>
              <th>Starting Season</th>
              <th>Me</th>
              <th>Links</th>
              {(visibleColumns?.score ?? true) && (
                <th title="Score">S {getSortIcon('mean')}</th>
              )}
              {(visibleColumns?.rank ?? true) && (
                <th title="Rank">R {getSortIcon('rank')}</th>
              )}
              {(visibleColumns?.popularity ?? true) && (
                <th title="Popularity">P {getSortIcon('popularity')}</th>
              )}
              {(visibleColumns?.users ?? true) && (
                <th title="Users">U {getSortIcon('num_list_users')}</th>
              )}
              {(visibleColumns?.scorers ?? true) && (
                <th title="Scorers">X {getSortIcon('num_scoring_users')}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedAnimes.map((anime) => (
              <tr key={anime.id}>
                <td className={styles.imageCell}>
                  {anime.main_picture?.medium ? (
                    <img
                      src={anime.main_picture.medium}
                      alt={anime.title}
                      className={`${styles.animeImage} ${styles[`imageSize${imageSize}`]}`}
                    />
                  ) : (
                    <div className={`${styles.noImage} ${styles[`imageSize${imageSize}`]}`}>No Image</div>
                  )}
                </td>
                <td className={styles.titleCell}>
                  <div className="title-content">
                    <div className={styles.primaryTitle}>{anime.title}</div>
                    {anime.alternative_titles?.en && anime.alternative_titles.en !== anime.title && (
                      <div className={styles.altTitle}>{anime.alternative_titles.en}</div>
                    )}
                  </div>
                  <div className={styles.genresInTitle}>{formatGenres(anime.genres || [])}</div>
                </td>
                <td className={styles.statusCell}>
                  <span className={`${styles.status} ${anime.status === 'currently_airing' ? styles.currentlyAiring : anime.status === 'finished_airing' ? styles.finishedAiring : anime.status === 'not_yet_aired' ? styles.notYetAired : ''}`}>
                    {formatStatus(anime.status)}
                  </span>
                </td>
                <td className={styles.episodesCell}>
                  {anime.num_episodes || 'TBA'}
                </td>
                <td className={styles.seasonCell}>
                  {anime.start_season ? (
                    <span
                      style={{
                        color: formatSeason(anime.start_season.year, anime.start_season.season).color,
                        fontWeight: 'bold'
                      }}
                    >
                      {formatSeason(anime.start_season.year, anime.start_season.season).label}
                    </span>
                  ) : (
                    <span style={{ color: '#6B7280' }}>Unknown</span>
                  )}
                </td>
                <td className={styles.meCell}>
                  <div>
                    <select
                      value={getDisplayStatus(anime)}
                      onChange={(e) => handleStatusChange(anime.id, e.target.value)}
                      className={`${styles.malStatus} ${getStatusClass(getDisplayStatus(anime))}`}
                    >
                      <option value="">Select Status</option>
                      <option value="watching">Watching</option>
                      <option value="completed">Completed</option>
                      <option value="on_hold">On Hold</option>
                      <option value="dropped">Dropped</option>
                      <option value="plan_to_watch">Plan to Watch</option>
                    </select>
                  </div>
                  <div>
                    <select
                      value={getDisplayScore(anime)}
                      onChange={(e) => handleScoreChange(anime.id, parseInt(e.target.value))}
                      className={`${styles.malScore} ${styles.editable}`}
                    >
                      <option value={0}>No Score</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => (
                        <option key={score} value={score}>{score}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.malEpisodes}>
                    <div className={styles.episodeButtons}>
                      <button
                        className={styles.episodeButton}
                        onClick={() => handleEpisodeChange(anime.id, getDisplayEpisodes(anime) + 1)}
                        title="Watch next episode"
                      >
                        +
                      </button>
                      <button
                        className={styles.episodeButton}
                        onClick={() => handleEpisodeChange(anime.id, getDisplayEpisodes(anime) - 1)}
                        title="Decrease episode count"
                      >
                        -
                      </button>
                    </div>
                    <span className={styles.episodeCounter}>
                      {getDisplayEpisodes(anime)}/{anime.num_episodes || '?'}
                    </span>
                  </div>
                </td>
                <td className={styles.linksCell}>
                  <div className={styles.actionsButtonGroup}>
                    <a
                      href={`https://myanimelist.net/anime/${anime.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.malLink}
                    >
                      MAL
                    </a>
                    <button
                      onClick={() => handleManualSearch(anime)}
                      className={styles.searchButton}
                      title="Search providers manually on Google"
                    >
                      🔍
                    </button>
                    <button
                      onClick={() => handleJustWatchSearch(anime)}
                      className={styles.justWatchButton}
                      title="Search on JustWatch"
                    >
                      <img
                        src="/justwatch.png"
                        alt="JustWatch"
                        className={styles.justWatchIcon}
                      />
                    </button>
                    <button
                      onClick={() => onHideToggle?.(anime.id, !anime.hidden)}
                      className={anime.hidden ? styles.showButton : styles.hideButton}
                      title={anime.hidden ? 'Show this anime' : 'Hide this anime'}
                    >
                      {anime.hidden ? 'Unhide' : 'Hide'}
                    </button>
                    {hasPendingUpdates(anime.id) && (
                      <button
                        onClick={() => handleUpdateMAL(anime.id)}
                        className={styles.updateButton}
                        title="Update MAL status"
                      >
                        Update
                      </button>
                    )}
                  </div>
                </td>
                {(visibleColumns?.score ?? true) && (
                  <td className={styles.scoreCell}>
                    {renderMetric(anime, 'mean')}
                  </td>
                )}
                {(visibleColumns?.rank ?? true) && (
                  <td className={styles.scoreCell}>
                    {renderMetric(anime, 'rank')}
                  </td>
                )}
                {(visibleColumns?.popularity ?? true) && (
                  <td className={styles.scoreCell}>
                    {renderMetric(anime, 'popularity')}
                  </td>
                )}
                {(visibleColumns?.users ?? true) && (
                  <td className={styles.scoreCell}>
                    {renderMetric(anime, 'num_list_users')}
                  </td>
                )}
                {(visibleColumns?.scorers ?? true) && (
                  <td className={styles.scoreCell}>
                    {renderMetric(anime, 'num_scoring_users')}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
