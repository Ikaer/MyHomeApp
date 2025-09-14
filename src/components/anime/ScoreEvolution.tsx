import React from 'react';
import styles from './ScoreEvolution.module.css';
import { AnimeScoresHistoryData } from '@/models/anime';

interface ScoreEvolutionProps {
  animeId: number;
  scoresHistory: AnimeScoresHistoryData;
}

const WEEKS_OPTIONS = [1, 2, 4, 8, 12, 24, 52];

const formatNumber = (num?: number) => {
  if (num === undefined) return 'N/A';
  if (Math.abs(num) >= 10000) {
    return `${Math.round(num / 1000)}k`;
  }
  if (Number.isInteger(num)) {
    return num.toString();
  }
  return num.toFixed(2);
};

const ScoreEvolution: React.FC<ScoreEvolutionProps> = ({ animeId, scoresHistory }) => {
  const [selectedWeeks, setSelectedWeeks] = React.useState(4);

  const history = scoresHistory[animeId];

  if (!history || Object.keys(history).length < 2) {
    return <span>-</span>;
  }

  const sortedDates = Object.keys(history).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  const latestDate = sortedDates[0];
  const latestData = history[latestDate];

  const targetDate = new Date(latestDate);
  targetDate.setDate(targetDate.getDate() - selectedWeeks * 7);

  const pastDate = sortedDates.find(d => new Date(d) <= targetDate);
  const pastData = pastDate ? history[pastDate] : null;

  const renderMetric = (label: string, latestValue?: number, pastValue?: number, higherIsBetter = true) => {
    if (latestValue === undefined) {
      return (
        <div className={styles.metric}>
          <span>{label}: N/A</span>
        </div>
      );
    }

    if (pastValue === undefined) {
      return (
        <div className={styles.metric}>
          <span>{label}: {formatNumber(latestValue)}</span>
        </div>
      );
    }

    const delta = latestValue - pastValue;
    if (Math.abs(delta) < 0.001) {
      return (
        <div className={styles.metric}>
          <span>{label}: {formatNumber(latestValue)}</span>
          <span className={styles.neutral}>-</span>
        </div>
      );
    }

    const isImprovement = higherIsBetter ? delta > 0 : delta < 0;
    const color = isImprovement ? styles.increase : styles.decrease;
    const arrow = isImprovement ? '▲' : '▼';
    
    const displayDelta = higherIsBetter ? delta : -delta;

    const formattedDelta = (deltaToFormat: number) => {
      const sign = deltaToFormat > 0 ? '+' : '';
      if (Math.abs(deltaToFormat) >= 10000) {
        return `(${sign}${Math.round(deltaToFormat / 1000)}k)`;
      }
      if (!Number.isInteger(deltaToFormat)) {
        return `(${sign}${deltaToFormat.toFixed(2)})`;
      }
      return `(${sign}${deltaToFormat})`;
    };

    return (
      <div className={styles.metric}>
        <span>{label}: {formatNumber(latestValue)}</span>
        <span className={`${styles.change} ${color}`}>{arrow} {formattedDelta(displayDelta)}</span>
      </div>
    );
  };

  return (
    <div className={styles.evolutionContainer}>
      <div className={styles.controls}>
        <select
          value={selectedWeeks}
          onChange={(e) => setSelectedWeeks(Number(e.target.value))}
          className={styles.weekSelector}
        >
          {WEEKS_OPTIONS.map(w => <option key={w} value={w}>{w} week{w > 1 ? 's' : ''}</option>)}
        </select>
      </div>
      <div className={styles.metricsContainer}>
        {renderMetric('Score', latestData.mean, pastData?.mean, true)}
        {renderMetric('Rank', latestData.rank, pastData?.rank, false)}
        {renderMetric('Popularity', latestData.popularity, pastData?.popularity, false)}
        {renderMetric('Users', latestData.num_list_users, pastData?.num_list_users, true)}
        {renderMetric('Scorers', latestData.num_scoring_users, pastData?.num_scoring_users, true)}
      </div>
    </div>
  );
};

export default ScoreEvolution;
