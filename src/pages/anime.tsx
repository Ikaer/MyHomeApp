import { useState, useEffect } from 'react';
import Head from 'next/head';
import { AnimePageLayout, AnimeSidebar, AnimeTable } from '@/components/anime';
import { AnimeWithExtensions, MALAuthState, AnimeView, AnimeScoresHistoryData, UserAnimeStatus } from '@/models/anime';

const ALL_STATUSES: (UserAnimeStatus | 'not_defined')[] = ["watching", "completed", "on_hold", "dropped", "plan_to_watch", "not_defined"];

export default function AnimePage() {
  // Auth State
  const [authState, setAuthState] = useState<MALAuthState>({ isAuthenticated: false });
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [isBigSyncing, setIsBigSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  
  // Data State
  const [animes, setAnimes] = useState<AnimeWithExtensions[]>([]);
  const [scoresHistory, setScoresHistory] = useState<AnimeScoresHistoryData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // UI State
  const [currentView, setCurrentView] = useState<AnimeView>('new_season_strict');
  const [evolutionPeriod, setEvolutionPeriod] = useState('1w');
  const [statusFilters, setStatusFilters] = useState<(UserAnimeStatus | 'not_defined')[]>(ALL_STATUSES);
  const [searchQuery, setSearchQuery] = useState('');

  // Initial Load
  useEffect(() => {
    checkAuthStatus();
    loadScoresHistory();
  }, []);

  // Reload animes when view or filters change
  useEffect(() => {
    loadAnimes();
  }, [currentView, statusFilters]);

  // Handle OAuth redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('auth')) {
      if (urlParams.get('auth') === 'success') {
        checkAuthStatus(); // Re-check auth status after successful login
      } else {
        setAuthError('Authentication failed. Please try again.');
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsAuthLoading(true);
      const response = await fetch('/api/anime/auth?action=status');
      const data = await response.json();
      setAuthState({ isAuthenticated: data.isAuthenticated, user: data.user });
    } catch (error) {
      console.error('Error checking auth status:', error);
      setAuthError('Failed to check authentication status');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const loadAnimes = async () => {
    try {
      setIsLoading(true);
      setError('');
      const statusQuery = statusFilters.join(',');
      const response = await fetch(`/api/anime/animes?view=${currentView}&status=${statusQuery}`);
      if (response.ok) {
        const data = await response.json();
        setAnimes(data.animes || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load anime list');
      }
    } catch (error) {
      console.error('Error loading animes:', error);
      setError('Failed to load anime list');
    } finally {
      setIsLoading(false);
    }
  };

  const loadScoresHistory = async () => {
    try {
      const response = await fetch('/api/anime/scores-history');
      if (response.ok) {
        const data = await response.json();
        setScoresHistory(data.history || {});
      }
    } catch (error) {
      console.error('Error loading scores history:', error);
    }
  };

  const handleConnect = async () => {
    try {
      setIsAuthLoading(true);
      setAuthError('');
      const response = await fetch('/api/anime/auth?action=login');
      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setAuthError('Failed to initiate authentication');
      }
    } catch (error) {
      console.error('Error connecting to MAL:', error);
      setAuthError('Failed to connect to MyAnimeList');
      setIsAuthLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsAuthLoading(true);
      setAuthError('');
      await fetch('/api/anime/auth', { method: 'POST', body: JSON.stringify({ action: 'logout' }) });
      setAuthState({ isAuthenticated: false });
    } catch (error) {
      console.error('Error disconnecting from MAL:', error);
      setAuthError('Failed to disconnect from MyAnimeList');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSync = async () => {
    if (!authState.isAuthenticated) return;
    setIsSyncing(true);
    setSyncError('');
    try {
      const response = await fetch('/api/anime/sync', { method: 'POST' });
      if (!response.ok) throw new Error('Sync failed');
      loadAnimes();
      loadScoresHistory();
    } catch (error) {
      setSyncError('Failed to sync data.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleBigSync = async () => {
    if (!authState.isAuthenticated) return;
    setIsBigSyncing(true);
    setSyncError('');
    try {
      const response = await fetch('/api/anime/big-sync', { method: 'POST' });
      if (!response.ok) throw new Error('Big sync failed');
      // Note: Big sync is a long process, UI feedback might be needed here
      loadAnimes();
      loadScoresHistory();
    } catch (error) {
      setSyncError('Failed to start big sync.');
    } finally {
      setIsBigSyncing(false);
    }
  };

  const handleStatusFilterChange = (status: UserAnimeStatus | 'not_defined', isChecked: boolean) => {
    const newFilters = isChecked
      ? [...statusFilters, status]
      : statusFilters.filter((s) => s !== status);
    setStatusFilters(newFilters);
  };

  const handleHideToggle = async (animeId: number, hide: boolean) => {
    try {
      const response = await fetch(`/api/anime/animes/${animeId}/hide`, { method: hide ? 'POST' : 'DELETE' });
      if (response.ok) {
        setAnimes(prev => prev.filter(a => a.id !== animeId));
      } else {
        setError(`Failed to ${hide ? 'hide' : 'unhide'} anime.`);
      }
    } catch (err) {
      setError(`Failed to ${hide ? 'hide' : 'unhide'} anime.`);
    }
  };

  const handleUpdateMALStatus = async (animeId: number, updates: any) => {
    try {
      const response = await fetch(`/api/anime/animes/${animeId}/mal-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (response.ok) {
        setAnimes(prev => prev.map(a => a.id === animeId ? { ...a, my_list_status: { ...a.my_list_status, ...updates } } : a));
      } else {
        throw new Error('Failed to update MAL status');
      }
    } catch (error) {
      setError('Failed to update MAL status.');
      throw error;
    }
  };

  const filteredAnimes = animes.filter(anime =>
    anime.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (anime.alternative_titles?.en || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (anime.alternative_titles?.ja || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sidebar = (
    <AnimeSidebar
      authState={authState}
      isAuthLoading={isAuthLoading}
      authError={authError}
      onConnect={handleConnect}
      onDisconnect={handleDisconnect}
      isSyncing={isSyncing}
      isBigSyncing={isBigSyncing}
      syncError={syncError}
      onSync={handleSync}
      onBigSync={handleBigSync}
      currentView={currentView}
      onViewChange={setCurrentView}
      statusFilters={statusFilters}
      onStatusFilterChange={handleStatusFilterChange}
      animeCount={animes.length}
      evolutionPeriod={evolutionPeriod}
      onEvolutionPeriodChange={setEvolutionPeriod}
    />
  );

  return (
    <>
      <Head>
        <title>Anime List - MyHomeApp</title>
        <meta name="description" content="Track seasonal anime with MyAnimeList integration" />
      </Head>
      <AnimePageLayout sidebar={sidebar}>
        <div className="anime-main-content">
          <div className="toolbar">
            <input
              type="text"
              placeholder="Search anime..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-bar"
            />
          </div>

          {error && (
            <div className="error-banner">
              {error} <button onClick={() => setError('')}>×</button>
            </div>
          )}

          <div className="table-container">
            {isLoading ? (
              <div className="loading-state">Loading...</div>
            ) : (
              <AnimeTable
                animes={filteredAnimes}
                scoresHistory={scoresHistory}
                currentView={currentView}
                scoreEvolutionPeriod={parseInt(evolutionPeriod.replace('w', ''))}
                onUpdateMALStatus={handleUpdateMALStatus}
                onHideToggle={handleHideToggle}
              />
            )}
          </div>
        </div>
      </AnimePageLayout>
      <style jsx>{`
        .anime-main-content {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .toolbar {
          display: flex;
        }
        .search-bar {
          width: 100%;
          padding: 0.75rem 1rem;
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          color: var(--text-primary);
          font-size: 1rem;
        }
        .error-banner {
          background: #fee2e2;
          color: #dc2626;
          padding: 1rem;
          border-radius: 8px;
        }
        .table-container {
          background: var(--bg-primary);
          border-radius: 8px;
          border: 1px solid var(--border-color);
          overflow: hidden;
        }
        .loading-state {
          text-align: center;
          padding: 3rem;
          color: var(--text-secondary);
        }
      `}</style>
    </>
  );
}