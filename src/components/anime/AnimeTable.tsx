import React, { useState, useMemo } from 'react';
import { AnimeWithExtensions, SortColumn, SortDirection } from '@/models/anime';
import { detectProviderFromUrl, getProviderLogoPath, generateGoogleORQuery, generateJustWatchQuery } from '@/lib/providers';
import styles from './AnimeTable.module.css';

interface AnimeTableProps {
  animes: AnimeWithExtensions[];
  onEditExtensions?: (anime: AnimeWithExtensions) => void;
}

export default function AnimeTable({ animes, onEditExtensions }: AnimeTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('mean');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

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

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return '↕️';
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
    return genres.slice(0, 3).map(g => g.name).join(', ') + 
           (genres.length > 3 ? ` +${genres.length - 3}` : '');
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
              <th 
                className={styles.sortable}
                onClick={() => handleSort('title')}
              >
                Title {getSortIcon('title')}
              </th>
              <th 
                className={styles.sortable}
                onClick={() => handleSort('mean')}
              >
                Score {getSortIcon('mean')}
              </th>
              <th 
                className={styles.sortable}
                onClick={() => handleSort('status')}
              >
                Status {getSortIcon('status')}
              </th>
              <th 
                className={styles.sortable}
                onClick={() => handleSort('num_episodes')}
              >
                Episodes {getSortIcon('num_episodes')}
              </th>
              <th>Genres</th>
              <th>Providers</th>
              <th>Links</th>
              <th>Actions</th>
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
                      className={styles.animeImage}
                    />
                  ) : (
                    <div className={styles.noImage}>No Image</div>
                  )}
                </td>
                <td className={styles.titleCell}>
                  <div className="title-content">
                    <div className={styles.primaryTitle}>{getEnglishTitle(anime)}</div>
                    {anime.alternative_titles?.en && anime.alternative_titles.en !== anime.title && (
                      <div className={styles.japaneseTitle}>{anime.title}</div>
                    )}
                  </div>
                </td>
                <td className={styles.scoreCell}>
                  <span className={`${styles.score} ${anime.mean ? (anime.mean >= 8 ? styles.high : anime.mean >= 7 ? styles.medium : styles.low) : styles.none}`}>
                    {formatScore(anime.mean)}
                  </span>
                </td>
                <td className={styles.statusCell}>
                  <span className={`${styles.status} ${anime.status === 'currently_airing' ? styles.currentlyAiring : anime.status === 'finished_airing' ? styles.finishedAiring : anime.status === 'not_yet_aired' ? styles.notYetAired : ''}`}>
                    {formatStatus(anime.status)}
                  </span>
                </td>
                <td className={styles.episodesCell}>
                  {anime.num_episodes || 'TBA'}
                </td>
                <td className={styles.genresCell}>
                  {formatGenres(anime.genres || [])}
                </td>
                <td className={styles.providersCell}>
                  {formatProviders(anime)}
                </td>
                <td className={styles.linksCell}>
                  <a 
                    href={`https://myanimelist.net/anime/${anime.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.malLink}
                  >
                    MAL
                  </a>
                </td>
                <td className={styles.actionsCell}>
                  <button 
                    onClick={() => onEditExtensions?.(anime)}
                    className={styles.editButton}
                    title="Edit providers and notes"
                  >
                    Edit
                  </button>
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
