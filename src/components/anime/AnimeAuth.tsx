import { useState, useEffect } from 'react';
import { MALAuthState } from '@/models/anime';

interface AnimeAuthProps {
  onAuthChange?: (authState: MALAuthState) => void;
}

export default function AnimeAuth({ onAuthChange }: AnimeAuthProps) {
  const [authState, setAuthState] = useState<MALAuthState>({
    isAuthenticated: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (onAuthChange) {
      onAuthChange(authState);
    }
  }, [authState, onAuthChange]);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/anime/auth?action=status');
      const data = await response.json();
      
      setAuthState({
        isAuthenticated: data.isAuthenticated,
        user: data.user
      });
    } catch (error) {
      console.error('Error checking auth status:', error);
      setError('Failed to check authentication status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      console.log('Initiating MAL connection...');
      
      const response = await fetch('/api/anime/auth?action=login');
      const data = await response.json();
      
      console.log('Auth response:', data);
      
      if (data.authUrl) {
        console.log('Redirecting to MAL OAuth URL:', data.authUrl);
        // Redirect to MAL OAuth
        window.location.href = data.authUrl;
      } else {
        console.error('No authUrl in response:', data);
        setError('Failed to initiate authentication');
      }
    } catch (error) {
      console.error('Error connecting to MAL:', error);
      setError('Failed to connect to MyAnimeList');
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await fetch('/api/anime/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'logout' }),
      });

      if (response.ok) {
        setAuthState({
          isAuthenticated: false,
          user: undefined
        });
      } else {
        setError('Failed to disconnect');
      }
    } catch (error) {
      console.error('Error disconnecting from MAL:', error);
      setError('Failed to disconnect from MyAnimeList');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="anime-auth">
        <button disabled className="auth-button loading">
          Loading...
        </button>
      </div>
    );
  }

  return (
    <div className="anime-auth">
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError('')} className="close-error">×</button>
        </div>
      )}
      
      {authState.isAuthenticated ? (
        <div className="auth-connected">
          <span className="user-info">
            Connected to MyAnimeList as <strong>{authState.user?.name}</strong>
          </span>
          <button 
            onClick={handleDisconnect}
            className="auth-button disconnect"
            disabled={isLoading}
          >
            Disconnect from MyAnimeList
          </button>
        </div>
      ) : (
        <button 
          onClick={handleConnect}
          className="auth-button connect"
          disabled={isLoading}
        >
          Connect to MyAnimeList
        </button>
      )}

      <style jsx>{`
        .anime-auth {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .auth-connected {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .user-info {
          color: #9ca3af;
          font-size: 0.875rem;
          white-space: nowrap;
        }

        .auth-button {
          padding: 0.5rem 0.875rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          font-size: 0.875rem;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .auth-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .auth-button.connect {
          background: #2563eb;
          color: white;
        }

        .auth-button.connect:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .auth-button.disconnect {
          background: #dc2626;
          color: white;
        }

        .auth-button.disconnect:hover:not(:disabled) {
          background: #b91c1c;
        }

        .auth-button.loading {
          background: #6b7280;
          color: white;
        }

        .error-message {
          background: #fee2e2;
          color: #dc2626;
          padding: 0.5rem;
          border-radius: 4px;
          margin-bottom: 0.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.875rem;
        }

        .close-error {
          background: none;
          border: none;
          color: #dc2626;
          cursor: pointer;
          font-size: 1.1rem;
          padding: 0;
          margin-left: 0.5rem;
        }
      `}</style>
    </div>
  );
}
