import React from 'react';
import styles from './DataSyncSection.module.css';
import { MALAuthState } from '@/models/anime';

interface DataSyncSectionProps {
  authState: MALAuthState;
  isSyncing: boolean;
  isBigSyncing: boolean;
  syncError: string;
  onSync: () => void;
  onBigSync: () => void;
}

const DataSyncSection: React.FC<DataSyncSectionProps> = ({
  authState,
  isSyncing,
  isBigSyncing,
  syncError,
  onSync,
  onBigSync,
}) => {
  return (
    <div className={styles.dataSyncSection}>
      <div className={styles.buttonGroup}>
        <button 
          onClick={onSync} 
          disabled={!authState.isAuthenticated || isSyncing || isBigSyncing} 
          className={styles.button}
        >
          {isSyncing ? 'Syncing...' : 'Sync Data'}
        </button>
        <button 
          onClick={onBigSync} 
          disabled={!authState.isAuthenticated || isSyncing || isBigSyncing} 
          className={`${styles.button} ${styles.bigSyncButton}`}
        >
          {isBigSyncing ? 'Big Syncing...' : 'Big Sync'}
        </button>
      </div>
      {syncError && <div className={styles.error}>{syncError}</div>}
    </div>
  );
};

export default DataSyncSection;
