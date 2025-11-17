import React from 'react';
import styles from './ViewsSection.module.css';
import { AnimeView } from '@/models/anime';
import { VIEW_PRESETS } from '@/lib/animeUtils';

interface ViewsSectionProps {
  onViewChange: (view: AnimeView) => void;
}

const ViewsSection: React.FC<ViewsSectionProps> = ({ onViewChange }) => {
  return (
    <div className={styles.viewsSection}>
      {VIEW_PRESETS.map(preset => (
        <button
          key={preset.key}
          className={styles.viewButton}
          onClick={() => onViewChange(preset.key)}
          title={preset.description}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
};

export default ViewsSection;
