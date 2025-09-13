import { useState, useEffect } from 'react';
import Head from 'next/head';
import { AnimeAuth, AnimeSync, AnimeTable, AnimeViewSelector } from '@/components/anime';
import { AnimeWithExtensions, MALAuthState, AnimeView, AnimeScoresHistoryData } from '@/models/anime';

export default function AnimePage() {
  const [authState, setAuthState] = useState<MALAuthState>({ isAuthenticated: false });
  const [animes, setAnimes] = useState<AnimeWithExtensions[]>([]);
  const [scoresHistory, setScoresHistory] = useState<AnimeScoresHistoryData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentView, setCurrentView] = useState<AnimeView>('new_season');

  useEffect(() => {
    loadAnimes();
    loadScoresHistory();
  }, [currentView]);

  useEffect(() => {
    // Check for auth success/error from OAuth redirect
    const urlParams = new URLSearchParams(window.location.search);
    const authResult = urlParams.get('auth');
    
    if (authResult === 'success') {
      // Clear URL params and refresh auth state
      window.history.replaceState({}, document.title, window.location.pathname);
      // Auth component will automatically refresh
    } else if (authResult === 'error') {
      setError('Authentication failed. Please try connecting again.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const loadAnimes = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await fetch(`/api/anime/animes?view=${currentView}`);
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

  const handleViewChange = (view: AnimeView) => {
    setCurrentView(view);
  };

  const handleSyncComplete = () => {
    loadAnimes();
    loadScoresHistory();
  };

  const handleUpdateMALStatus = async (animeId: number, updates: any) => {
    try {
      setError('');
      
      const response = await fetch(`/api/anime/animes/${animeId}/mal-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        // Update local state immediately to reflect changes
        setAnimes(prevAnimes => 
          prevAnimes.map(anime => {
            if (anime.id === animeId) {
              return {
                ...anime,
                my_list_status: {
                  ...anime.my_list_status,
                  ...updates,
                  updated_at: new Date().toISOString()
                }
              };
            }
            return anime;
          })
        );
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update MAL status');
        throw new Error(errorData.error || 'Failed to update MAL status');
      }
    } catch (error) {
      console.error('Error updating MAL status:', error);
      setError('Failed to update MAL status');
      throw error;
    }
  };

  return (
    <>
      <Head>
        <title>Anime List - MyHomeApp</title>
        <meta name="description" content="Track seasonal anime with MyAnimeList integration" />
      </Head>

      <div className="anime-page">
        <div className="page-header">
          <div className="header-controls">
            <AnimeAuth onAuthChange={setAuthState} />
            <AnimeSync authState={authState} onSyncComplete={handleSyncComplete} />
          </div>
        </div>

        {error && (
          <div className="error-banner">
            {error}
            <button onClick={() => setError('')} className="close-error">×</button>
          </div>
        )}

        <AnimeViewSelector 
          currentView={currentView} 
          onViewChange={handleViewChange}
          animeCount={animes.length}
          isLoading={isLoading}
        />

        <div className="content-section">
          {isLoading ? (
              <div className="loading-state">
                <p>Loading anime list...</p>
              </div>
            ) : (
              <AnimeTable 
                animes={animes} 
                scoresHistory={scoresHistory}
                onUpdateMALStatus={handleUpdateMALStatus}
              />
            )}
        </div>

        <style jsx>{`
          .anime-page {
              max-width: 2560px;
              margin: 0 auto;
              padding: 1rem 2rem;
            }

            .page-header {
              margin-bottom: 2rem;
              display: flex;
              justify-content: flex-end;
              align-items: center;
            }

            .header-controls {
              display: flex;
              align-items: center;
              gap: 1rem;
            }

            .error-banner {
              background: #fee2e2;
              color: #dc2626;
              padding: 1rem;
              border-radius: 8px;
              margin-bottom: 2rem;
              display: flex;
              justify-content: space-between;
              align-items: center;
              border: 1px solid #fecaca;
            }

            .close-error {
              background: none;
              border: none;
              color: #dc2626;
              cursor: pointer;
              font-size: 1.2rem;
              padding: 0;
              margin-left: 1rem;
            }

            .content-section {
              background: #1f2937;
              border-radius: 8px;
              border: 1px solid #374151;
              overflow: hidden;
            }

            .loading-state {
              text-align: center;
              padding: 3rem;
              color: #6b7280;
            }
          `}</style>
      </div>
    </>
  );
}
