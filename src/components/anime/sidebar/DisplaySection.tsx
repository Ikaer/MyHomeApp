import React from 'react';
import styles from './DisplaySection.module.css';
import { ImageSize } from '@/models/anime';

interface DisplaySectionProps {
  imageSize: ImageSize;
  onImageSizeChange: (size: ImageSize) => void;
}

const DisplaySection: React.FC<DisplaySectionProps> = ({
  imageSize,
  onImageSizeChange,
}) => {
  return (
    <div className={styles.displaySection}>
      <label className={styles.label}>Image Size:</label>
      <div className={styles.sizeButtons}>
        <button
          className={`${styles.sizeButton} ${imageSize === 0 ? styles.activeSizeButton : ''}`}
          onClick={() => onImageSizeChange(0)}
        >
          Original
        </button>
        <button
          className={`${styles.sizeButton} ${imageSize === 1 ? styles.activeSizeButton : ''}`}
          onClick={() => onImageSizeChange(1)}
        >
          x1
        </button>
        <button
          className={`${styles.sizeButton} ${imageSize === 2 ? styles.activeSizeButton : ''}`}
          onClick={() => onImageSizeChange(2)}
        >
          x2
        </button>
        <button
          className={`${styles.sizeButton} ${imageSize === 3 ? styles.activeSizeButton : ''}`}
          onClick={() => onImageSizeChange(3)}
        >
          x3
        </button>
      </div>
    </div>
  );
};

export default DisplaySection;
