import React from 'react';
import styles from './ViewsSection.module.css';
import { VIEW_PRESETS } from '@/lib/animeUrlParams';
import { useAnimeUrlState } from '@/hooks';

const ViewsSection: React.FC = () => {
  const { applyPreset } = useAnimeUrlState();

  const handlePresetClick = (getState: () => any) => {
    applyPreset(getState());
  };

  return (
    <div className={styles.viewsSection}>
      {VIEW_PRESETS.map(preset => (
        <button
          key={preset.key}
          className={styles.viewButton}
          onClick={() => handlePresetClick(preset.getState)}
          title={preset.description}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
};

export default ViewsSection;
