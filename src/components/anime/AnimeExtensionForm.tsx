import { useState, useEffect } from 'react';
import { AnimeWithExtensions, AnimeExtension, AnimeProvider } from '@/models/anime';
import { detectProviderFromUrl, getAllProviders, getProviderLogoPath, formatProviderOption } from '@/lib/providers';
import styles from './AnimeExtensionForm.module.css';

interface AnimeExtensionFormProps {
  anime: AnimeWithExtensions;
  onSave?: (extension: AnimeExtension) => void;
  onCancel?: () => void;
  onClose?: () => void;
}

export default function AnimeExtensionForm({ anime, onSave, onCancel, onClose }: AnimeExtensionFormProps) {
  const [providers, setProviders] = useState<AnimeProvider[]>([]);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadExistingData();
  }, [anime.id]);

  // Handle escape key and prevent background scroll
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCancel();
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);
    
    // Prevent background scroll
    document.body.style.overflow = 'hidden';

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, []);

  const loadExistingData = async () => {
    try {
      const response = await fetch(`/api/anime/animes/${anime.id}/extensions`);
      if (response.ok) {
        const data = await response.json();
        setProviders(data.extensions.providers || []);
        setNotes(data.extensions.notes || '');
      }
    } catch (error) {
      console.error('Error loading extension data:', error);
      setError('Failed to load existing data');
    }
  };

  const addProvider = () => {
    setProviders([...providers, { name: '', url: '' }]);
  };

  const updateProvider = (index: number, field: 'name' | 'url', value: string) => {
    const updated = providers.map((provider, i) => {
      if (i === index) {
        const updatedProvider = { ...provider, [field]: value };
        
        // Auto-detect provider when URL is entered/changed
        if (field === 'url' && value.trim()) {
          const detectedProvider = detectProviderFromUrl(value);
          if (detectedProvider) {
            updatedProvider.name = detectedProvider.name;
          }
        }
        
        return updatedProvider;
      }
      return provider;
    });
    setProviders(updated);
  };

  const removeProvider = (index: number) => {
    setProviders(providers.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Validate providers - must be detected from URL
      const invalidProviders = providers.filter(p => p.url.trim() && !detectProviderFromUrl(p.url));
      if (invalidProviders.length > 0) {
        setError('Some provider URLs are not recognized. Please use supported streaming service URLs.');
        setIsLoading(false);
        return;
      }

      // Filter out empty providers and ensure all have detected names
      const validProviders = providers
        .filter(p => p.url.trim())
        .map(p => {
          const detectedProvider = detectProviderFromUrl(p.url);
          return {
            name: detectedProvider?.name || p.name,
            url: p.url.trim()
          };
        });
      
      const extension: AnimeExtension = {
        providers: validProviders,
        notes: notes.trim()
      };

      const response = await fetch(`/api/anime/animes/${anime.id}/extensions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(extension),
      });

      if (response.ok) {
        if (onSave) {
          onSave(extension);
        }
        if (onClose) {
          onClose();
        }
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save extension data');
      }
    } catch (error) {
      console.error('Error saving extension:', error);
      setError('Failed to save extension data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else if (onClose) {
      onClose();
    }
  };

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking on the overlay itself, not its children
    if (event.target === event.currentTarget) {
      handleCancel();
    }
  };

  const getAnimeTitle = () => {
    return anime.alternative_titles?.en || anime.title;
  };

  return (
    <div className={styles.extensionFormOverlay} onClick={handleOverlayClick}>
      <div className={styles.extensionForm}>
        <div className={styles.formHeader}>
          <h3>Edit Anime Extensions</h3>
          <button onClick={handleCancel} className={styles.closeButton}>×</button>
        </div>

        <div className={styles.animeInfo}>
          <div className={styles.animeDetails}>
            {anime.main_picture?.medium && (
              <img 
                src={anime.main_picture.medium} 
                alt={anime.title}
                className={styles.animeImage}
              />
            )}
            <div>
              <h4>{getAnimeTitle()}</h4>
              {anime.alternative_titles?.en && anime.alternative_titles.en !== anime.title && (
                <p className={styles.japaneseTitle}>{anime.title}</p>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className={styles.errorMessage}>
            {error}
            <button onClick={() => setError('')} className={styles.closeError}>×</button>
          </div>
        )}

        <div className={styles.formContent}>
          <div className={styles.formSection}>
            <h4>Streaming Providers</h4>
            <p className={styles.helpText}>
              Enter the direct URL to the anime page. Supported providers: Netflix, Crunchyroll, ADN, Disney+, Prime Video
            </p>
            <div className={styles.providersList}>
              {providers.map((provider, index) => {
                const detectedProvider = detectProviderFromUrl(provider.url);
                const hasError = provider.url && !detectedProvider;
                
                return (
                  <div key={index} className={styles.providerRow}>
                    <div className={styles.providerUrlGroup}>
                      <input
                        type="url"
                        placeholder="URL to anime page (e.g., https://www.crunchyroll.com/series/...)"
                        value={provider.url}
                        onChange={(e) => updateProvider(index, 'url', e.target.value)}
                        className={`${styles.providerUrl} ${hasError ? styles.providerUrlError : ''}`}
                      />
                      {detectedProvider && (
                        <div className={styles.providerPreview}>
                          <img 
                            src={getProviderLogoPath(detectedProvider)} 
                            alt={detectedProvider.name}
                            className={styles.providerLogoImg}
                          />
                          <span className={styles.providerDetectedName}>{detectedProvider.name}</span>
                        </div>
                      )}
                      {hasError && (
                        <div className={styles.providerError}>
                          Provider not recognized. Please use a supported streaming service URL.
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => removeProvider(index)}
                      className={styles.removeProvider}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
            <button onClick={addProvider} className={styles.addProvider} type="button">
              Add Provider
            </button>
          </div>

          <div className={styles.formSection}>
            <label htmlFor="notes">Personal Notes</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Your thoughts, ratings, or any other notes about this anime..."
              rows={4}
              className={styles.notesTextarea}
            />
          </div>
        </div>

        <div className={styles.formActions}>
          <button 
            onClick={handleCancel}
            className={styles.cancelButton}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className={styles.saveButton}
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>

      </div>
    </div>
  );
}
