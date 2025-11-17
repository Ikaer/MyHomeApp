import { useState, useEffect } from 'react';
import Head from 'next/head';
import { AnimePageLayout, AnimeSidebar, AnimeTable } from '@/components/anime';
import { AnimeWithExtensions, MALAuthState, AnimeView, AnimeScoresHistoryData, UserAnimeStatus, ImageSize, VisibleColumns, StatsColumn, SortColumn, SortDirection } from '@/models/anime';
import { mapViewToFilters } from '@/lib/animeUtils';

const ALL_STATUSES: (UserAnimeStatus | 'not_defined')[] = ["watching", "completed", "on_hold", "dropped", "plan_to_watch", "not_defined"];

export default function AnimePage() {
  const [authState, setAuthState] = useState<MALAuthState>({ isAuthenticated: false });
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isBigSyncing, setIsBigSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [animes, setAnimes] = useState<AnimeWithExtensions[]>([]);
  const [scoresHistory, setScoresHistory] = useState<AnimeScoresHistoryData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [evolutionPeriod, setEvolutionPeriod] = useState('1w');
  const [imageSize, setImageSize] = useState<ImageSize>(1);
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>({
    score: true,
    scoreDelta: true,
    rank: true,
    rankDelta: true,
    popularity: true,
    popularityDelta: true,
    users: true,
    usersDelta: true,
    scorers: true,
    scorersDelta: true,
  });
  const [statusFilters, setStatusFilters] = useState<(UserAnimeStatus | 'not_defined')[]>(ALL_STATUSES);
  const [searchQuery, setSearchQuery] = useState('');
  const [seasons, setSeasons] = useState<Array<{year:number; season:'winter'|'spring'|'summer'|'fall'}>>([]);
  const [mediaTypes, setMediaTypes] = useState<string[]>([]);
  const [hiddenOnly, setHiddenOnly] = useState(false);
  const [minScore, setMinScore] = useState<number | null>(null);
  const [maxScore, setMaxScore] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortColumn>('mean');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [sidebarExpanded, setSidebarExpanded] = useState<Record<string, boolean>>({
    account: true,
    sync: true,
    views: true,
    display: true,
    filters: true,
    sort: true,
    stats: true,
  });

  useEffect(() => {
    checkAuthStatus();
    loadScoresHistory();
    loadUserPreferences();
  }, []);

  useEffect(() => { loadAnimes(); }, [statusFilters, searchQuery, seasons, mediaTypes, hiddenOnly, minScore, maxScore, sortBy, sortDir]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('auth')) {
      if (urlParams.get('auth') === 'success') {
        checkAuthStatus();
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
    } finally { setIsAuthLoading(false); }
  };

  const loadAnimes = async () => {
    try {
      setIsLoading(true);
      setError('');
  const statusQuery = statusFilters.join(',');
      const params = new URLSearchParams();
      if (statusQuery) params.set('status', statusQuery);
      if (searchQuery) params.set('search', searchQuery);
      if (seasons.length > 0) {
        const seasonParam = seasons.map(s => `${s.year}-${s.season}`).join(',');
        params.set('season', seasonParam);
      }
      if (mediaTypes.length > 0) params.set('mediaType', mediaTypes.join(','));
      params.set('hidden', hiddenOnly ? 'true' : 'false');
      if (minScore !== null) params.set('minScore', minScore.toString());
      if (maxScore !== null) params.set('maxScore', maxScore.toString());
      params.set('sortBy', sortBy);
      params.set('sortDir', sortDir);
      const response = await fetch(`/api/anime/animes?${params.toString()}`);
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
    } finally { setIsLoading(false); }
  };

  const loadScoresHistory = async () => { try { const r = await fetch('/api/anime/scores-history'); if (r.ok) { const d = await r.json(); setScoresHistory(d.history || {}); } } catch (e) { console.error('Error loading scores history:', e);} };

  const loadUserPreferences = async () => {
    try {
      const r = await fetch('/api/anime/preferences');
      if (r.ok) {
        const prefs = await r.json();
        
        // Load sort preferences
        if (prefs.sortBy) setSortBy(prefs.sortBy);
        if (prefs.sortDir) setSortDir(prefs.sortDir);
        
        // Load filter preferences
        if (prefs.statusFilters) setStatusFilters(prefs.statusFilters);
        if (prefs.searchQuery !== undefined) setSearchQuery(prefs.searchQuery);
        if (prefs.seasons) setSeasons(prefs.seasons);
        if (prefs.mediaTypes) setMediaTypes(prefs.mediaTypes);
        if (prefs.hiddenOnly !== undefined) setHiddenOnly(prefs.hiddenOnly);
        if (prefs.minScore !== undefined) setMinScore(prefs.minScore);
        if (prefs.maxScore !== undefined) setMaxScore(prefs.maxScore);
        
        // Load display preferences
        if (prefs.evolutionPeriod) setEvolutionPeriod(prefs.evolutionPeriod);
        if (prefs.imageSize) setImageSize(prefs.imageSize);
        if (prefs.visibleColumns) setVisibleColumns(prefs.visibleColumns);
        
        // Load UI state
        if (prefs.sidebarExpanded) setSidebarExpanded(prefs.sidebarExpanded);
        
        // Legacy: load currentView if present (for backward compat)
        if (prefs.currentView) {
          // Don't apply preset on load - just use the saved filter state
        }
      }
    } catch (e) {
      console.error('Error loading user preferences:', e);
    }
  };

  const saveUserPreferences = async (updates: Partial<{
    currentView: AnimeView;
    statusFilters: (UserAnimeStatus | 'not_defined')[];
    evolutionPeriod: string;
    imageSize: ImageSize;
    visibleColumns: VisibleColumns;
    sortBy: SortColumn;
    sortDir: SortDirection;
    searchQuery: string;
    seasons: Array<{year:number; season:'winter'|'spring'|'summer'|'fall'}>;
    mediaTypes: string[];
    hiddenOnly: boolean;
    minScore: number | null;
    maxScore: number | null;
    sidebarExpanded: Record<string, boolean>;
  }>) => { try { await fetch('/api/anime/preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) }); } catch (e) { console.error('Error saving user preferences:', e);} };

  const handleSortByChange = (c: SortColumn) => { setSortBy(c); saveUserPreferences({ sortBy: c }); };
  const handleSortDirChange = (d: SortDirection) => { setSortDir(d); saveUserPreferences({ sortDir: d }); };
  const handleSidebarExpandedChange = (section: string, isExpanded: boolean) => {
    const newExpanded = { ...sidebarExpanded, [section]: isExpanded };
    setSidebarExpanded(newExpanded);
    saveUserPreferences({ sidebarExpanded: newExpanded });
  };

  const handleConnect = async () => { try { setIsAuthLoading(true); setAuthError(''); const r = await fetch('/api/anime/auth?action=login'); const d = await r.json(); if (d.authUrl) { window.location.href = d.authUrl; } else { setAuthError('Failed to initiate authentication'); } } catch (e) { console.error('Error connecting to MAL:', e); setAuthError('Failed to connect to MyAnimeList'); setIsAuthLoading(false);} };
  const handleDisconnect = async () => { try { setIsAuthLoading(true); setAuthError(''); await fetch('/api/anime/auth', { method: 'POST', body: JSON.stringify({ action: 'logout' }) }); setAuthState({ isAuthenticated: false }); } catch (e) { console.error('Error disconnecting from MAL:', e); setAuthError('Failed to disconnect from MyAnimeList'); } finally { setIsAuthLoading(false);} };

  const handleSync = async () => { if (!authState.isAuthenticated) return; setIsSyncing(true); setSyncError(''); try { const r = await fetch('/api/anime/sync', { method: 'POST' }); if (!r.ok) throw new Error('Sync failed'); loadAnimes(); loadScoresHistory(); } catch (e) { setSyncError('Failed to sync data.'); } finally { setIsSyncing(false);} };
  const handleBigSync = async () => { if (!authState.isAuthenticated) return; setIsBigSyncing(true); setSyncError(''); try { const r = await fetch('/api/anime/big-sync', { method: 'POST' }); if (!r.ok) throw new Error('Big sync failed'); loadAnimes(); loadScoresHistory(); } catch (e) { setSyncError('Failed to start big sync.'); } finally { setIsBigSyncing(false);} };

  const handleStatusFilterChange = (status: UserAnimeStatus | 'not_defined', isChecked: boolean) => { const newFilters = isChecked ? [...statusFilters, status] : statusFilters.filter(s => s !== status); setStatusFilters(newFilters); saveUserPreferences({ statusFilters: newFilters }); };
  const handleVisibleColumnsChange = (column: StatsColumn, isVisible: boolean) => { const newVisibleColumns = { ...visibleColumns, [column]: isVisible }; setVisibleColumns(newVisibleColumns); saveUserPreferences({ visibleColumns: newVisibleColumns }); };
  const handleHideToggle = async (animeId: number, hide: boolean) => { try { const r = await fetch(`/api/anime/animes/${animeId}/hide`, { method: hide ? 'POST' : 'DELETE' }); if (r.ok) { setAnimes(prev => prev.filter(a => a.id !== animeId)); } else { setError(`Failed to ${hide ? 'hide' : 'unhide'} anime.`); } } catch { setError(`Failed to ${hide ? 'hide' : 'unhide'} anime.`);} };
  const handleUpdateMALStatus = async (animeId: number, updates: any) => { try { const r = await fetch(`/api/anime/animes/${animeId}/mal-status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) }); if (r.ok) { setAnimes(prev => prev.map(a => a.id === animeId ? { ...a, my_list_status: { ...a.my_list_status, ...updates } } : a)); } else { throw new Error('Failed to update MAL status'); } } catch (e) { setError('Failed to update MAL status.'); throw e; } };

  const filteredAnimes = animes;

  const applyPreset = (preset: AnimeView, persist: boolean = true) => {
    // Full reset of all filter-related state before applying new preset
    setSearchQuery('');
    setSeasons([]);
    setMediaTypes([]);
    setHiddenOnly(false);
    setMinScore(null);
    setMaxScore(null);
    setStatusFilters(ALL_STATUSES); // baseline: all statuses selected

    const filters = mapViewToFilters(preset);

    // Seasons (parse CSV 'YYYY-season')
    if (filters.season) {
      const seasonMap: Record<string, 'winter'|'spring'|'summer'|'fall'> = { winter:'winter', spring:'spring', summer:'summer', fall:'fall', autumn:'fall' };
      const tokens = filters.season.split(',').map((s: string) => s.trim()).filter(Boolean);
      const parsed: Array<{year:number; season:'winter'|'spring'|'summer'|'fall'}> = [];
      for (const t of tokens) {
        const [y, s] = t.split('-');
        const year = Number(y);
        const norm = seasonMap[(s || '').toLowerCase()];
        if (year && Number.isInteger(year) && norm) parsed.push({ year, season: norm });
      }
      setSeasons(parsed);
    }

    // Status logic (override baseline for certain presets)
    if (preset === 'hidden') {
      // Hidden preset: only hidden filter, no status filter sent
      setStatusFilters([]);
    } else if (filters.status) {
      setStatusFilters([filters.status as UserAnimeStatus]);
    } else if (preset === 'find_shows') {
      // Discovery preset: show only items not in list by selecting 'not_defined'
      setStatusFilters(['not_defined']);
    }

    // Media types
    if (filters.mediaType) {
      setMediaTypes(filters.mediaType.split(','));
    }

    // Hidden toggle
  if (filters.hidden === 'true') setHiddenOnly(true);

    // Sort overrides from preset (fallback keep existing if not provided)
    if (filters.sortBy) setSortBy(filters.sortBy as SortColumn);
    if (filters.sortDir === 'asc' || filters.sortDir === 'desc') setSortDir(filters.sortDir as SortDirection);
  };

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
      onViewChange={(view) => applyPreset(view)}
      imageSize={imageSize}
      onImageSizeChange={(size) => { setImageSize(size); saveUserPreferences({ imageSize: size }); }}
      statusFilters={statusFilters}
      onStatusFilterChange={handleStatusFilterChange}
      seasons={seasons}
      onSeasonsChange={(s) => { setSeasons(s); saveUserPreferences({ seasons: s }); }}
      mediaTypes={mediaTypes}
      onMediaTypesChange={(mt) => { setMediaTypes(mt); saveUserPreferences({ mediaTypes: mt }); }}
      hiddenOnly={hiddenOnly}
      onHiddenOnlyChange={(h) => { setHiddenOnly(h); saveUserPreferences({ hiddenOnly: h }); }}
      minScore={minScore}
      onMinScoreChange={(ms) => { setMinScore(ms); saveUserPreferences({ minScore: ms }); }}
      maxScore={maxScore}
      onMaxScoreChange={(ms) => { setMaxScore(ms); saveUserPreferences({ maxScore: ms }); }}
      searchQuery={searchQuery}
      onSearchChange={(q) => { setSearchQuery(q); saveUserPreferences({ searchQuery: q }); }}
      animeCount={animes.length}
      evolutionPeriod={evolutionPeriod}
      onEvolutionPeriodChange={(period) => { setEvolutionPeriod(period); saveUserPreferences({ evolutionPeriod: period }); }}
      visibleColumns={visibleColumns}
      onVisibleColumnsChange={handleVisibleColumnsChange}
      sidebarExpanded={sidebarExpanded}
      onSidebarExpandedChange={handleSidebarExpandedChange}
      sortBy={sortBy}
      sortDir={sortDir}
      onSortByChange={handleSortByChange}
      onSortDirChange={handleSortDirChange}
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
          {error && (
            <div className="error-banner">{error} <button onClick={() => setError('')}>×</button></div>
          )}
          <div className="table-container">
            {isLoading ? (
              <div className="loading-state">Loading...</div>
            ) : (
              <AnimeTable
                animes={filteredAnimes}
                scoresHistory={scoresHistory}
                scoreEvolutionPeriod={parseInt(evolutionPeriod.replace('w', ''))}
                imageSize={imageSize}
                visibleColumns={visibleColumns}
                sortColumn={sortBy}
                sortDirection={sortDir}
                onUpdateMALStatus={handleUpdateMALStatus}
                onHideToggle={handleHideToggle}
              />
            )}
          </div>
        </div>
      </AnimePageLayout>
      <style jsx>{`
        .anime-main-content { display: flex; flex-direction: column; gap: 1rem; }
        .error-banner { background: #fee2e2; color: #dc2626; padding: 1rem; border-radius: 8px; }
        .table-container { background: var(--bg-primary); border-radius: 8px; border: 1px solid var(--border-color); overflow: hidden; }
        .loading-state { text-align: center; padding: 3rem; color: var(--text-secondary); }
      `}</style>
    </>
  );
}
