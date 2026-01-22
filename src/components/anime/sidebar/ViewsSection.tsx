import React from 'react';
import { useRouter } from 'next/router';
import styles from './ViewsSection.module.css';
import { VIEW_PRESET_URLS } from '@/lib/animeUrlParams';

const ViewsSection: React.FC = () => {
  const router = useRouter();

  const handlePresetClick = (getUrl: () => string) => {
    router.push(getUrl());
  };

  return (
    <div className={styles.viewsSection}>
      {VIEW_PRESET_URLS.map(preset => (
        <button
          key={preset.key}
          className={styles.viewButton}
          onClick={() => handlePresetClick(preset.getUrl)}
          title={preset.description}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
};

export default ViewsSection;
