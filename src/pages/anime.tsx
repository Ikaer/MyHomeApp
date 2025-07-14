import { useState, useEffect } from 'react';
import Head from 'next/head';
import { AnimeAuth, AnimeSync, AnimeTable, AnimeExtensionForm } from '@/components/anime';
import { AnimeWithExtensions, MALAuthState } from '@/models/anime';

export default function AnimePage() {
  const [authState, setAuthState] = useState<MALAuthState>({ isAuthenticated: false });
  const [animes, setAnimes] = useState<AnimeWithExtensions[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingAnime, setEditingAnime] = useState<AnimeWithExtensions | null>(null);

  useEffect(() => {
    loadAnimes();
  }, []);

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
      
      const response = await fetch('/api/anime/animes');
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

  const handleSyncComplete = () => {
    loadAnimes();
  };

  const handleEditExtensions = (anime: AnimeWithExtensions) => {
    setEditingAnime(anime);
  };

  const handleExtensionSave = () => {
    setEditingAnime(null);
    loadAnimes(); // Refresh the list to show updated extensions
  };

  const handleExtensionCancel = () => {
    setEditingAnime(null);
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

        <div className="content-section">
          {isLoading ? (
              <div className="loading-state">
                <p>Loading anime list...</p>
              </div>
            ) : (
              <AnimeTable 
                animes={animes} 
                onEditExtensions={handleEditExtensions}
              />
            )}
        </div>

        {editingAnime && (
          <AnimeExtensionForm
            anime={editingAnime}
            onSave={handleExtensionSave}
            onCancel={handleExtensionCancel}
            onClose={handleExtensionCancel}
          />
        )}

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
