import { useState, useEffect } from 'react';
import { AnimeWithExtensions, AnimeExtension, AnimeProvider } from '@/models/anime';

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
    const updated = providers.map((provider, i) => 
      i === index ? { ...provider, [field]: value } : provider
    );
    setProviders(updated);
  };

  const removeProvider = (index: number) => {
    setProviders(providers.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Validate providers
      const validProviders = providers.filter(p => p.name.trim() && p.url.trim());
      
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

  const getAnimeTitle = () => {
    return anime.alternative_titles?.en || anime.title;
  };

  return (
    <div className="extension-form-overlay">
      <div className="extension-form">
        <div className="form-header">
          <h3>Edit Anime Extensions</h3>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="anime-info">
          <div className="anime-details">
            {anime.main_picture?.medium && (
              <img 
                src={anime.main_picture.medium} 
                alt={anime.title}
                className="anime-image"
              />
            )}
            <div>
              <h4>{getAnimeTitle()}</h4>
              {anime.alternative_titles?.en && anime.alternative_titles.en !== anime.title && (
                <p className="japanese-title">{anime.title}</p>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => setError('')} className="close-error">×</button>
          </div>
        )}

        <div className="form-content">
          <div className="form-section">
            <h4>Streaming Providers</h4>
            <div className="providers-list">
              {providers.map((provider, index) => (
                <div key={index} className="provider-row">
                  <input
                    type="text"
                    placeholder="Provider name (e.g., Crunchyroll)"
                    value={provider.name}
                    onChange={(e) => updateProvider(index, 'name', e.target.value)}
                    className="provider-name"
                  />
                  <input
                    type="url"
                    placeholder="URL to anime page"
                    value={provider.url}
                    onChange={(e) => updateProvider(index, 'url', e.target.value)}
                    className="provider-url"
                  />
                  <button 
                    onClick={() => removeProvider(index)}
                    className="remove-provider"
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addProvider} className="add-provider" type="button">
              Add Provider
            </button>
          </div>

          <div className="form-section">
            <label htmlFor="notes">Personal Notes</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Your thoughts, ratings, or any other notes about this anime..."
              rows={4}
              className="notes-textarea"
            />
          </div>
        </div>

        <div className="form-actions">
          <button 
            onClick={handleCancel}
            className="cancel-button"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="save-button"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>

        <style jsx>{`
          .extension-form-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 1rem;
          }

          .extension-form {
            background: white;
            border-radius: 8px;
            width: 100%;
            max-width: 600px;
            max-height: 90vh;
            overflow-y: auto;
          }

          .form-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem;
            border-bottom: 1px solid #e5e7eb;
          }

          .form-header h3 {
            margin: 0;
            color: #111827;
          }

          .close-button {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #6b7280;
          }

          .close-button:hover {
            color: #374151;
          }

          .anime-info {
            padding: 1rem 1.5rem;
            background: #f9fafb;
            border-bottom: 1px solid #e5e7eb;
          }

          .anime-details {
            display: flex;
            gap: 1rem;
            align-items: center;
          }

          .anime-image {
            width: 60px;
            height: 85px;
            object-fit: cover;
            border-radius: 4px;
          }

          .anime-details h4 {
            margin: 0;
            color: #111827;
          }

          .japanese-title {
            margin: 0.25rem 0 0 0;
            font-size: 0.875rem;
            color: #6b7280;
          }

          .form-content {
            padding: 1.5rem;
          }

          .form-section {
            margin-bottom: 2rem;
          }

          .form-section h4 {
            margin: 0 0 1rem 0;
            color: #374151;
          }

          .form-section label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
            color: #374151;
          }

          .providers-list {
            margin-bottom: 1rem;
          }

          .provider-row {
            display: grid;
            grid-template-columns: 1fr 2fr auto;
            gap: 0.5rem;
            margin-bottom: 0.5rem;
            align-items: center;
          }

          .provider-name,
          .provider-url {
            padding: 0.5rem;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            font-size: 0.875rem;
          }

          .provider-name:focus,
          .provider-url:focus {
            outline: none;
            border-color: #2563eb;
            ring: 2px;
            ring-color: #dbeafe;
          }

          .remove-provider {
            background: #dc2626;
            color: white;
            border: none;
            padding: 0.5rem 0.75rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.875rem;
          }

          .remove-provider:hover {
            background: #b91c1c;
          }

          .add-provider {
            background: #16a34a;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.875rem;
          }

          .add-provider:hover {
            background: #15803d;
          }

          .notes-textarea {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            font-size: 0.875rem;
            resize: vertical;
            min-height: 100px;
          }

          .notes-textarea:focus {
            outline: none;
            border-color: #2563eb;
            ring: 2px;
            ring-color: #dbeafe;
          }

          .form-actions {
            display: flex;
            justify-content: flex-end;
            gap: 1rem;
            padding: 1.5rem;
            border-top: 1px solid #e5e7eb;
          }

          .cancel-button,
          .save-button {
            padding: 0.75rem 1.5rem;
            border: 1px solid;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
          }

          .cancel-button {
            background: white;
            color: #374151;
            border-color: #d1d5db;
          }

          .cancel-button:hover:not(:disabled) {
            background: #f9fafb;
          }

          .save-button {
            background: #2563eb;
            color: white;
            border-color: #2563eb;
          }

          .save-button:hover:not(:disabled) {
            background: #1d4ed8;
          }

          .save-button:disabled,
          .cancel-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .error-message {
            background: #fee2e2;
            color: #dc2626;
            padding: 0.75rem;
            margin: 0 1.5rem;
            border-radius: 4px;
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

          @media (max-width: 768px) {
            .extension-form-overlay {
              padding: 0.5rem;
            }

            .provider-row {
              grid-template-columns: 1fr;
              gap: 0.25rem;
            }

            .anime-details {
              flex-direction: column;
              align-items: flex-start;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
