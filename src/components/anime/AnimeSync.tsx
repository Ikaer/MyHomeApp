import { useState, useEffect } from 'react';
import { MALAuthState, SyncMetadata } from '@/models/anime';

interface AnimeSyncProps {
  authState: MALAuthState;
  onSyncComplete?: () => void;
}

export default function AnimeSync({ authState, onSyncComplete }: AnimeSyncProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isBigSyncLoading, setIsBigSyncLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [syncMetadata, setSyncMetadata] = useState<SyncMetadata | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<any>(null);
  const [bigSyncProgress, setBigSyncProgress] = useState<any>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  useEffect(() => {
    loadSyncMetadata();
    
    // Cleanup on unmount
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventSource]);

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

  const handleBigSync = async () => {
    if (!authState.isAuthenticated) {
      setError('You must be connected to MyAnimeList to sync');
      return;
    }

    try {
      setIsBigSyncLoading(true);
      setError('');
      setBigSyncProgress(null);
      
      // Start the big sync process
      const startResponse = await fetch('/api/anime/big-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!startResponse.ok) {
        const errorData = await startResponse.json();
        throw new Error(errorData.error || 'Failed to start big sync');
      }

      const { syncId } = await startResponse.json();

      // Connect to the event stream for progress updates
      const newEventSource = new EventSource(`/api/anime/big-sync?syncId=${syncId}`);
      setEventSource(newEventSource);

      newEventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setBigSyncProgress(data);
          
          if (data.type === 'complete') {
            setLastSyncResult(data);
            setSyncMetadata(data.metadata);
            if (onSyncComplete) {
              onSyncComplete();
            }
            newEventSource.close();
            setEventSource(null);
            setIsBigSyncLoading(false);
          } else if (data.type === 'error') {
            setError(data.error || data.message || 'Failed to perform big sync');
            newEventSource.close();
            setEventSource(null);
            setIsBigSyncLoading(false);
          }
        } catch (parseError) {
          console.error('Error parsing big sync progress:', parseError);
        }
      };

      newEventSource.onerror = (error) => {
        console.error('Big sync EventSource error:', error);
        setError('Connection to sync service failed');
        newEventSource.close();
        setEventSource(null);
        setIsBigSyncLoading(false);
      };

    } catch (error) {
      console.error('Error starting big sync:', error);
      setError('Failed to start big sync');
      setIsBigSyncLoading(false);
      if (eventSource) {
        eventSource.close();
        setEventSource(null);
      }
    }
  };

  const handleCancelBigSync = () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
    setIsBigSyncLoading(false);
    setBigSyncProgress(null);
    setError('Big sync cancelled by user');
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
          disabled={!authState.isAuthenticated || isLoading || isBigSyncLoading}
        >
          {isLoading ? 'Syncing...' : 'Sync Anime Data'}
        </button>

        <button 
          onClick={handleBigSync}
          className="big-sync-button"
          disabled={!authState.isAuthenticated || isLoading || isBigSyncLoading}
        >
          {isBigSyncLoading ? 'Big Syncing...' : 'Big Sync (10 Years)'}
        </button>

        {!authState.isAuthenticated && (
          <p className="sync-hint">
            Connect to MyAnimeList to sync anime data
          </p>
        )}
      </div>

      {bigSyncProgress && isBigSyncLoading && (
        <div className="big-sync-progress">
          <div className="progress-header">
            <h4>Big Sync Progress</h4>
            <button 
              onClick={handleCancelBigSync}
              className="cancel-button"
              title="Cancel Big Sync"
            >
              ✕
            </button>
          </div>
          <div className="progress-content">
            <p className="progress-message">{bigSyncProgress.message}</p>
            {bigSyncProgress.totalSeasons && (
              <div className="progress-bar-container">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${(bigSyncProgress.currentSeason / bigSyncProgress.totalSeasons) * 100}%` }}
                  ></div>
                </div>
                <span className="progress-text">
                  {bigSyncProgress.currentSeason} / {bigSyncProgress.totalSeasons} seasons
                </span>
              </div>
            )}
            {bigSyncProgress.totalAnimeCount && (
              <p className="anime-count">Total anime synced: {bigSyncProgress.totalAnimeCount}</p>
            )}
            {bigSyncProgress.year && bigSyncProgress.season && (
              <p className="current-season">
                Current: {bigSyncProgress.year} {bigSyncProgress.season}
              </p>
            )}
          </div>
        </div>
      )}

      {lastSyncResult && (
        <div className="sync-result success">
          <h4>Sync Completed Successfully!</h4>
          <div className="sync-stats">
            <p><strong>Synced:</strong> {lastSyncResult.syncedCount} anime</p>
            {lastSyncResult.currentSeason && (
              <>
                <p><strong>Current Season:</strong> {lastSyncResult.currentSeason.season} {lastSyncResult.currentSeason.year}</p>
                <p><strong>Previous Season:</strong> {lastSyncResult.previousSeason.season} {lastSyncResult.previousSeason.year}</p>
              </>
            )}
            {lastSyncResult.processedSeasons && (
              <p><strong>Processed Seasons:</strong> {lastSyncResult.processedSeasons} seasons</p>
            )}
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
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .sync-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .sync-button {
          padding: 0.5rem 0.875rem;
          background: #16a34a;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          font-size: 0.875rem;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .sync-button:hover:not(:disabled) {
          background: #15803d;
        }

        .sync-button:disabled {
          background: #6b7280;
          cursor: not-allowed;
        }

        .big-sync-button {
          padding: 0.5rem 0.875rem;
          background: #dc2626;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          font-size: 0.875rem;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .big-sync-button:hover:not(:disabled) {
          background: #b91c1c;
        }

        .big-sync-button:disabled {
          background: #6b7280;
          cursor: not-allowed;
        }

        .sync-hint {
          color: #6b7280;
          font-size: 0.75rem;
          white-space: nowrap;
        }

        .sync-result {
          display: none; /* Hide detailed sync results in inline mode */
        }

        .sync-metadata {
          display: none; /* Hide metadata in inline mode */
        }

        .big-sync-progress {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 8px;
          padding: 1.5rem;
          min-width: 400px;
          max-width: 500px;
          z-index: 1000;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
        }

        .big-sync-progress h4 {
          margin: 0 0 1rem 0;
          color: #f9fafb;
          font-size: 1.1rem;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .cancel-button {
          background: #dc2626;
          color: white;
          border: none;
          border-radius: 4px;
          width: 24px;
          height: 24px;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cancel-button:hover {
          background: #b91c1c;
        }

        .progress-content {
          color: #d1d5db;
        }

        .progress-message {
          margin: 0 0 1rem 0;
          font-size: 0.9rem;
        }

        .progress-bar-container {
          margin: 1rem 0;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: #374151;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .progress-fill {
          height: 100%;
          background: #16a34a;
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 0.8rem;
          color: #9ca3af;
        }

        .anime-count {
          margin: 0.5rem 0 0 0;
          font-size: 0.9rem;
          color: #10b981;
          font-weight: 500;
        }

        .current-season {
          margin: 0.5rem 0 0 0;
          font-size: 0.8rem;
          color: #a78bfa;
          font-style: italic;
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
