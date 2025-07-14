import { useState, useMemo } from 'react';
import { AnimeWithExtensions, SortColumn, SortDirection } from '@/models/anime';

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
      return <span className="no-providers">No providers</span>;
    }

    return (
      <div className="providers-list">
        {anime.extensions.providers.map((provider, index) => (
          <a 
            key={index}
            href={provider.url}
            target="_blank"
            rel="noopener noreferrer"
            className="provider-link"
            title={`Watch on ${provider.name}`}
          >
            {provider.name}
          </a>
        ))}
      </div>
    );
  };

  if (animes.length === 0) {
    return (
      <div className="empty-state">
        <p>No anime found. Try syncing data or adjusting your filters.</p>
      </div>
    );
  }

  return (
    <div className="anime-table-container">
      <div className="table-info">
        <p>Showing {sortedAnimes.length} anime</p>
      </div>
      
      <div className="table-wrapper">
        <table className="anime-table">
          <thead>
            <tr>
              <th>Image</th>
              <th 
                className="sortable"
                onClick={() => handleSort('title')}
              >
                Title {getSortIcon('title')}
              </th>
              <th 
                className="sortable"
                onClick={() => handleSort('mean')}
              >
                Score {getSortIcon('mean')}
              </th>
              <th 
                className="sortable"
                onClick={() => handleSort('status')}
              >
                Status {getSortIcon('status')}
              </th>
              <th 
                className="sortable"
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
                <td className="image-cell">
                  {anime.main_picture?.medium ? (
                    <img 
                      src={anime.main_picture.medium} 
                      alt={anime.title}
                      className="anime-image"
                    />
                  ) : (
                    <div className="no-image">No Image</div>
                  )}
                </td>
                <td className="title-cell">
                  <div className="title-content">
                    <div className="primary-title">{getEnglishTitle(anime)}</div>
                    {anime.alternative_titles?.en && anime.alternative_titles.en !== anime.title && (
                      <div className="japanese-title">{anime.title}</div>
                    )}
                  </div>
                </td>
                <td className="score-cell">
                  <span className={`score ${anime.mean ? (anime.mean >= 8 ? 'high' : anime.mean >= 7 ? 'medium' : 'low') : 'none'}`}>
                    {formatScore(anime.mean)}
                  </span>
                </td>
                <td className="status-cell">
                  <span className={`status ${anime.status}`}>
                    {formatStatus(anime.status)}
                  </span>
                </td>
                <td className="episodes-cell">
                  {anime.num_episodes || 'TBA'}
                </td>
                <td className="genres-cell">
                  {formatGenres(anime.genres || [])}
                </td>
                <td className="providers-cell">
                  {formatProviders(anime)}
                </td>
                <td className="links-cell">
                  <a 
                    href={`https://myanimelist.net/anime/${anime.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mal-link"
                  >
                    MAL
                  </a>
                </td>
                <td className="actions-cell">
                  <button 
                    onClick={() => onEditExtensions?.(anime)}
                    className="edit-button"
                    title="Edit providers and notes"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .anime-table-container {
          margin-top: 1rem;
        }

        .table-info {
          margin-bottom: 1rem;
          color: #6b7280;
        }

        .table-wrapper {
          overflow-x: auto;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }

        .anime-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
        }

        .anime-table th,
        .anime-table td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }

        .anime-table th {
          background: #f9fafb;
          font-weight: 600;
          color: #374151;
          position: sticky;
          top: 0;
        }

        .sortable {
          cursor: pointer;
          user-select: none;
        }

        .sortable:hover {
          background: #f3f4f6;
        }

        .image-cell {
          width: 60px;
          text-align: center;
        }

        .anime-image {
          width: 50px;
          height: 70px;
          object-fit: cover;
          border-radius: 4px;
        }

        .no-image {
          width: 50px;
          height: 70px;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .title-cell {
          min-width: 200px;
          max-width: 300px;
        }

        .primary-title {
          font-weight: 500;
          color: #111827;
        }

        .japanese-title {
          font-size: 0.875rem;
          color: #6b7280;
          margin-top: 0.25rem;
        }

        .score-cell {
          width: 80px;
          text-align: center;
        }

        .score {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-weight: 500;
        }

        .score.high {
          background: #d1fae5;
          color: #065f46;
        }

        .score.medium {
          background: #fef3c7;
          color: #92400e;
        }

        .score.low {
          background: #fee2e2;
          color: #991b1b;
        }

        .score.none {
          color: #6b7280;
        }

        .status-cell {
          width: 120px;
        }

        .status {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .status.currently_airing {
          background: #d1fae5;
          color: #065f46;
        }

        .status.finished_airing {
          background: #e0e7ff;
          color: #3730a3;
        }

        .status.not_yet_aired {
          background: #fef3c7;
          color: #92400e;
        }

        .episodes-cell {
          width: 80px;
          text-align: center;
        }

        .genres-cell {
          max-width: 150px;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .providers-cell {
          min-width: 120px;
        }

        .providers-list {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .provider-link {
          font-size: 0.875rem;
          color: #2563eb;
          text-decoration: none;
          padding: 0.125rem 0.25rem;
          border-radius: 4px;
          border: 1px solid #e5e7eb;
        }

        .provider-link:hover {
          background: #eff6ff;
          border-color: #2563eb;
        }

        .no-providers {
          font-size: 0.875rem;
          color: #6b7280;
          font-style: italic;
        }

        .links-cell {
          width: 60px;
        }

        .mal-link {
          color: #2563eb;
          text-decoration: none;
          font-weight: 500;
          padding: 0.25rem 0.5rem;
          border: 1px solid #2563eb;
          border-radius: 4px;
          font-size: 0.875rem;
        }

        .mal-link:hover {
          background: #2563eb;
          color: white;
        }

        .actions-cell {
          width: 80px;
        }

        .edit-button {
          background: #f59e0b;
          color: white;
          border: none;
          padding: 0.375rem 0.75rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .edit-button:hover {
          background: #d97706;
        }

        .empty-state {
          text-align: center;
          padding: 3rem;
          color: #6b7280;
        }

        @media (max-width: 768px) {
          .table-wrapper {
            font-size: 0.875rem;
          }
          
          .anime-table th,
          .anime-table td {
            padding: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}
