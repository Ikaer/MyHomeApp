import React from 'react';
import styles from './AccountSection.module.css';
import { MALAuthState } from '@/models/anime';

interface AccountSectionProps {
  authState: MALAuthState;
  isAuthLoading: boolean;
  authError: string;
  onConnect: () => void;
  onDisconnect: () => void;
}

const AccountSection: React.FC<AccountSectionProps> = ({
  authState,
  isAuthLoading,
  authError,
  onConnect,
  onDisconnect,
}) => {
  return (
    <div className={styles.accountsSection}>
      {isAuthLoading ? (
        <button disabled className={styles.button}>Loading...</button>
      ) : authState.isAuthenticated ? (
        <div className={styles.connectedAccount}>
          <span>Connected as <strong>{authState.user?.name}</strong></span>
          <button onClick={onDisconnect} className={`${styles.button} ${styles.disconnectButton}`}>
            Disconnect
          </button>
        </div>
      ) : (
        <button onClick={onConnect} className={`${styles.button} ${styles.connectButton}`}>
          Connect to MyAnimeList
        </button>
      )}
      {authError && <div className={styles.error}>{authError}</div>}
    </div>
  );
};

export default AccountSection;
