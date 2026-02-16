import { Card } from '@/components/shared';
import styles from './SubAppCard.module.css';
import { SubApp } from '@/types';

interface SubAppCardProps {
  subApp: SubApp;
}

export default function SubAppCard({ subApp }: SubAppCardProps) {
  const getStatusInfo = () => {
    if (!subApp.enabled) {
      return {
        className: 'status-coming-soon',
        text: 'Coming Soon'
      };
    }
    return {
      className: 'status-enabled',
      text: 'Available'
    };
  };

  const status = getStatusInfo();

  if (!subApp.enabled) {
    return (
      <Card>
        <span className={styles.cardIcon}>{subApp.icon}</span>
        <h3 className={styles.cardTitle}>{subApp.name}</h3>
        <p className={styles.cardDescription}>{subApp.description}</p>
        <span className={`status ${status.className}`}>
          {status.text}
        </span>
      </Card>
    );
  }

  return (
    <Card href={subApp.route}>
      <span className={styles.cardIcon}>{subApp.icon}</span>
      <h3 className={styles.cardTitle}>{subApp.name}</h3>
      <p className={styles.cardDescription}>{subApp.description}</p>
      <span className={`status ${status.className}`}>
        {status.text}
      </span>
    </Card>
  );
}
