import { useState } from 'react';
import { AnimeWithExtensions } from '@/models/anime';
import { SearchResult, categorizeSearchResults } from '@/lib/providers';
import styles from './ProviderDiscovery.module.css';

interface ProviderDiscoveryProps {
  anime: AnimeWithExtensions;
  isOpen: boolean;
  onClose: () => void;
  onSelectProvider: (url: string, providerName: string) => void;
}

interface ProviderDiscoveryState {
  isLoading: boolean;
  results: SearchResult[];
  error: string | null;
}

export default function ProviderDiscovery({ 
  anime, 
  isOpen, 
  onClose, 
  onSelectProvider 
}: ProviderDiscoveryProps) {
  const [state, setState] = useState<ProviderDiscoveryState>({
    isLoading: false,
    results: [],
    error: null
  });

  const handleScrapeProviders = async () => {
    setState({ isLoading: true, results: [], error: null });

    try {
      // Use the anime title for search
      const searchTitle = anime.alternative_titles?.en || anime.title;
      
      // Call the real API endpoint for provider discovery
      const response = await fetch('/api/anime/discover-providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ animeTitle: searchTitle }),
      });

      if (!response.ok) {
        throw new Error('Failed to discover providers');
      }

      const data = await response.json();
      
      setState({
        isLoading: false,
        results: data.results || [],
        error: null
      });
    } catch (error) {
      setState({
        isLoading: false,
        results: [],
        error: error instanceof Error ? error.message : 'Failed to scrape providers'
      });
    }
  };

  const handleSelectUrl = (result: SearchResult) => {
    onSelectProvider(result.url, result.provider);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Provider Discovery: {anime.alternative_titles?.en || anime.title}</h3>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>

        <div className={styles.content}>
          {!state.isLoading && state.results.length === 0 && !state.error && (
            <div className={styles.initialState}>
              <p>Search for streaming providers for this anime.</p>
              <button 
                onClick={handleScrapeProviders}
                className={styles.scrapeButton}
              >
                🔍 Search Providers
              </button>
            </div>
          )}

          {state.isLoading && (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Searching for providers...</p>
            </div>
          )}

          {state.error && (
            <div className={styles.error}>
              <p>❌ Error: {state.error}</p>
              <button 
                onClick={handleScrapeProviders}
                className={styles.retryButton}
              >
                Try Again
              </button>
            </div>
          )}

          {state.results.length > 0 && (
            <div className={styles.results}>
              <h4>Found {state.results.length} provider(s):</h4>
              <div className={styles.resultsList}>
                {state.results.map((result, index) => (
                  <div key={index} className={styles.resultItem}>
                    <div className={styles.resultHeader}>
                      <span className={`${styles.provider} ${styles[`priority${result.priority}`]}`}>
                        {result.provider}
                      </span>
                      <span className={styles.priority}>Priority {result.priority}</span>
                    </div>
                    <h5 className={styles.resultTitle}>{result.title}</h5>
                    {result.snippet && (
                      <p className={styles.snippet}>{result.snippet}</p>
                    )}
                    <div className={styles.resultActions}>
                      <a 
                        href={result.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={styles.previewButton}
                      >
                        👁️ Preview
                      </a>
                      <button 
                        onClick={() => handleSelectUrl(result)}
                        className={styles.selectButton}
                      >
                        ✅ Select This URL
                      </button>
                    </div>
                    <div className={styles.url}>{result.url}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button onClick={onClose} className={styles.cancelButton}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
