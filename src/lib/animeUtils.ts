/**
 * Client-safe anime utility functions
 * These functions can be used in both client and server components
 */

// Utility function to format season display with nice labels and colors
import { AnimeScoresHistoryData, AnimeScoreHistory } from "@/models/anime";

export const formatSeason = (year: number, season: string) => {
  const seasonMap: Record<string, { label: string; color: string }> = {
    'spring': { label: 'Spring', color: '#10B981' }, // Green
    'summer': { label: 'Summer', color: '#F59E0B' }, // Orange
    'fall': { label: 'Fall', color: '#EF4444' },     // Red
    'winter': { label: 'Winter', color: '#3B82F6' }  // Blue
  };
  
  const seasonInfo = seasonMap[season] || { label: season, color: '#6B7280' };
  return {
    label: `${seasonInfo.label} ${year}`,
    color: seasonInfo.color
  };
}

export const getScoreEvolution = (
  animeId: number,
  scoresHistory: AnimeScoresHistoryData,
  selectedWeeks: number
) => {
  const history = scoresHistory[animeId];
  const result: {
    latestData: AnimeScoreHistory | null;
    pastData: AnimeScoreHistory | null;
    deltas: Partial<Record<keyof AnimeScoreHistory, number>>;
  } = {
    latestData: null,
    pastData: null,
    deltas: {},
  };

  if (!history || Object.keys(history).length === 0) {
    return result;
  }

  const sortedDates = Object.keys(history).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  const latestDate = sortedDates[0];
  result.latestData = history[latestDate];

  if (Object.keys(history).length < 2) {
    return result;
  }

  const targetDate = new Date(latestDate);
  targetDate.setDate(targetDate.getDate() - selectedWeeks * 7);

  const pastDate = sortedDates.find(d => new Date(d) <= targetDate);
  result.pastData = pastDate ? history[pastDate] : null;

  if (result.latestData && result.pastData) {
    const metrics: (keyof AnimeScoreHistory)[] = ['mean', 'rank', 'popularity', 'num_list_users', 'num_scoring_users'];
    metrics.forEach(metric => {
      const latestValue = result.latestData![metric] as number | undefined;
      const pastValue = result.pastData![metric] as number | undefined;
      if (latestValue !== undefined && pastValue !== undefined) {
        result.deltas[metric] = latestValue - pastValue;
      }
    });
  }

  return result;
};

// You can add other client-safe anime utility functions here
