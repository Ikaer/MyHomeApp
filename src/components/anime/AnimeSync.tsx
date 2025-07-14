import { useState, useEffect } from 'react';
import { MALAuthState, SyncMetadata } from '@/models/anime';

interface AnimeSyncProps {
  authState: MALAuthState;
  onSyncComplete?: () => void;
}

export default function AnimeSync({ authState, onSyncComplete }: AnimeSyncProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [syncMetadata, setSyncMetadata] = useState<SyncMetadata | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<any>(null);

  useEffect(() => {
    loadSyncMetadata();
  }, []);

  const loadSyncMetadata = async () => {
    try {
      const response = await fetch('/api/anime/animes');
      if (response.ok) {
        const data = await response.json();
        // We'll get metadata from the sync endpoint when available
      }
    } catch (error) {
      console.error('Error loading sync metadata:', error);
    }
  };

  const handleSync = async () => {
    if (!authState.isAuthenticated) {
      setError('You must be connected to MyAnimeList to sync');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      const response = await fetch('/api/anime/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setLastSyncResult(data);
        setSyncMetadata(data.metadata);
        if (onSyncComplete) {
          onSyncComplete();
        }
      } else {
        setError(data.error || 'Failed to sync anime data');
      }
    } catch (error) {
      console.error('Error syncing anime:', error);
      setError('Failed to sync anime data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="anime-sync">
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError('')} className="close-error">×</button>
        </div>
      )}

      <div className="sync-controls">
        <button 
          onClick={handleSync}
          className="sync-button"
          disabled={!authState.isAuthenticated || isLoading}
        >
          {isLoading ? 'Syncing...' : 'Sync Anime Data'}
        </button>

        {!authState.isAuthenticated && (
          <p className="sync-hint">
            Connect to MyAnimeList to sync anime data
          </p>
        )}
      </div>

      {lastSyncResult && (
        <div className="sync-result success">
          <h4>Sync Completed Successfully!</h4>
          <div className="sync-stats">
            <p><strong>Synced:</strong> {lastSyncResult.syncedCount} anime</p>
            <p><strong>Current Season:</strong> {lastSyncResult.currentSeason.season} {lastSyncResult.currentSeason.year}</p>
            <p><strong>Previous Season:</strong> {lastSyncResult.previousSeason.season} {lastSyncResult.previousSeason.year}</p>
          </div>
        </div>
      )}

      {syncMetadata && (
        <div className="sync-metadata">
          <h4>Last Sync Information</h4>
          <div className="metadata-grid">
            <div className="metadata-item">
              <span className="label">Last Sync:</span>
              <span className="value">{formatDate(syncMetadata.lastSyncDate)}</span>
            </div>
            <div className="metadata-item">
              <span className="label">Total Anime:</span>
              <span className="value">{syncMetadata.totalAnimeCount}</span>
            </div>
            <div className="metadata-item">
              <span className="label">Current Season:</span>
              <span className="value">{syncMetadata.currentSeason.season} {syncMetadata.currentSeason.year}</span>
            </div>
            <div className="metadata-item">
              <span className="label">Previous Season:</span>
              <span className="value">{syncMetadata.previousSeason.season} {syncMetadata.previousSeason.year}</span>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .anime-sync {
          margin-bottom: 1.5rem;
          padding: 1rem;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: #f9f9f9;
        }

        .sync-controls {
          margin-bottom: 1rem;
        }

        .sync-button {
          padding: 0.75rem 1.5rem;
          background: #16a34a;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.2s;
        }

        .sync-button:hover:not(:disabled) {
          background: #15803d;
        }

        .sync-button:disabled {
          background: #6b7280;
          cursor: not-allowed;
        }

        .sync-hint {
          margin-top: 0.5rem;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .sync-result {
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1rem;
        }

        .sync-result.success {
          background: #d1fae5;
          border: 1px solid #10b981;
          color: #064e3b;
        }

        .sync-result h4 {
          margin: 0 0 0.5rem 0;
          color: #065f46;
        }

        .sync-stats p {
          margin: 0.25rem 0;
        }

        .sync-metadata {
          border-top: 1px solid #e5e7eb;
          padding-top: 1rem;
        }

        .sync-metadata h4 {
          margin: 0 0 1rem 0;
          color: #374151;
        }

        .metadata-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 0.75rem;
        }

        .metadata-item {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem;
          background: white;
          border-radius: 4px;
          border: 1px solid #e5e7eb;
        }

        .label {
          font-weight: 500;
          color: #6b7280;
        }

        .value {
          color: #374151;
        }

        .error-message {
          background: #fee2e2;
          color: #dc2626;
          padding: 0.5rem;
          border-radius: 4px;
          margin-bottom: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .close-error {
          background: none;
          border: none;
          color: #dc2626;
          cursor: pointer;
          font-size: 1.2rem;
          padding: 0;
          margin-left: 0.5rem;
        }
      `}</style>
    </div>
  );
}
