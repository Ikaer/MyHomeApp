/**
 * Client-safe anime utility functions
 * These functions can be used in both client and server components
 */

// Utility function to format season display with nice labels and colors
import { AnimeScoresHistoryData, AnimeScoreHistory, AnimeView, CalendarAnimeView, AnimeWithExtensions } from "@/models/anime";

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

export const filterFindShowsView = (animes: AnimeWithExtensions[], view: AnimeView): AnimeWithExtensions[] => {
  if (view === 'find_shows') {
    return animes.filter(anime => anime.media_type === 'tv' && !anime.my_list_status);
  }
  return animes;
};

export const filterHiddenView= (animes: AnimeWithExtensions[], view: AnimeView): AnimeWithExtensions[] => {
  if (view === 'hidden') {
    return animes.filter(anime => anime.hidden);
  }
  else{
    return animes.filter(anime => !anime.hidden);
  }
}

export const filterStatusView = (animes: AnimeWithExtensions[], view: AnimeView): AnimeWithExtensions[] => {
  if (['watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch'].includes(view)) {
    return animes.filter(anime => anime.my_list_status?.status === view);
  }
  return animes;
}

export const filterCalendarView = (animes: AnimeWithExtensions[], view: AnimeView): AnimeWithExtensions[] => {
  const seasonInfos = getSeasonInfos();
  const currentSeason = seasonInfos.current;
  const previousSeason = seasonInfos.previous;
  const nextSeason = seasonInfos.next;

  if (view === 'next_season') {
    return animes.filter(anime => {
      if (!anime.start_season) return false;
      return anime.start_season.year === nextSeason.year && anime.start_season.season === nextSeason.season;
    });
  }
  else if (view === 'new_season_strict') {
    return animes.filter(anime => {
      if (!anime.start_season) return false;
      return anime.start_season.year === currentSeason.year && anime.start_season.season === currentSeason.season;
    });
  }
  else if (view === 'new_season') {
    return animes.filter(anime => {
      if (!anime.start_season) return false;

      const animeYear = anime.start_season.year;
      const animeSeason = anime.start_season.season;

      // Include all anime from current season (any status)
      if (animeYear === currentSeason.year && animeSeason === currentSeason.season) {
        return true;
      }

      // Include all anime from previous season (any status)
      if (animeYear === previousSeason.year && animeSeason === previousSeason.season) {
        return true;
      }

      return false;
    });
  }
  return animes;
}

type Season = 'winter' | 'spring' | 'summer' | 'fall';
type SeasonInfo = { year: number; season: Season };
type SeasonInfos = { current: SeasonInfo; previous: SeasonInfo; next: SeasonInfo };

export function getSeasonInfos(): SeasonInfos {

  // Default: new_season view (current implementation)
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

  // Determine current season
  const month = currentDate.getMonth(); // 0-11
  let currentSeason: Season;
  if (month >= 0 && month <= 2) currentSeason = 'winter';
  else if (month >= 3 && month <= 5) currentSeason = 'spring';
  else if (month >= 6 && month <= 8) currentSeason = 'summer';
  else currentSeason = 'fall';

  // Determine previous season
  let prevYear = currentYear;
  let prevSeason: Season;
  if (currentSeason === 'winter') { prevSeason = 'fall'; prevYear--; }
  else if (currentSeason === 'spring') prevSeason = 'winter';
  else if (currentSeason === 'summer') prevSeason = 'spring';
  else prevSeason = 'summer';

  // Determine next season
  let nextYear = currentYear;
  let nextSeason: Season;
  if (currentSeason === 'winter') nextSeason = 'spring';
  else if (currentSeason === 'spring') nextSeason = 'summer';
  else if (currentSeason === 'summer') nextSeason = 'fall';
  else { nextSeason = 'winter'; nextYear++; }

  return {
    current: { year: currentYear, season: currentSeason },
    previous: { year: prevYear, season: prevSeason },
    next: { year: nextYear, season: nextSeason },
  };
}


// You can add other client-safe anime utility functions here
