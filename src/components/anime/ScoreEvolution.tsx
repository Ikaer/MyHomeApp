import React from 'react';
import styles from './ScoreEvolution.module.css';
import { AnimeScoreHistory, AnimeScoresHistoryData } from '@/models/anime';

interface ScoreEvolutionProps {
  animeId: number;
  scoresHistory: AnimeScoresHistoryData;
}

const WEEKS_OPTIONS = [1, 2, 4, 8, 12, 24, 52];

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

  const calculateChange = (latest?: number, past?: number) => {
    if (latest === undefined || past === undefined || past === 0) {
      return { value: undefined, isIncrease: false };
    }
    const change = ((latest - past) / past) * 100;
    return { value: change, isIncrease: change > 0 };
  };

  const renderMetric = (label: string, latestValue?: number, pastValue?: number) => {
    const { value, isIncrease } = calculateChange(latestValue, pastValue);
    if (value === undefined) {
      return (
        <div className={styles.metric}>
          <span>{label}: {latestValue ?? 'N/A'}</span>
        </div>
      );
    }
    const color = value === 0 ? styles.neutral : isIncrease ? styles.increase : styles.decrease;
    const arrow = value === 0 ? '' : isIncrease ? '▲' : '▼';

    return (
      <div className={`${styles.metric} ${color}`}>
        <span>{label}: {latestValue}</span>
        <span className={styles.change}>{arrow} {value.toFixed(2)}%</span>
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
        {renderMetric('Score', latestData.mean, pastData?.mean)}
        {renderMetric('Rank', latestData.rank, pastData?.rank)}
        {renderMetric('Popularity', latestData.popularity, pastData?.popularity)}
        {renderMetric('Users', latestData.num_list_users, pastData?.num_list_users)}
        {renderMetric('Scorers', latestData.num_scoring_users, pastData?.num_scoring_users)}
      </div>
    </div>
  );
};

export default ScoreEvolution;
