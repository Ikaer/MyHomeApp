/**
 * Client-safe anime utility functions
 * These functions can be used in both client and server components
 */

// Utility function to format season display with nice labels and colors
import { AnimeScoresHistoryData, AnimeScoreHistory, AnimeView, CalendarAnimeView, AnimeWithExtensions, UserAnimeStatus, SortColumn, SortDirection } from "@/models/anime";

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


// Map old view system to new filter parameters
// View preset definition
export interface ViewPreset {
  key: AnimeView;
  label: string;
  description: string;
  seasonStrategy?: 'current' | 'current_previous' | 'next' | null; // dynamic seasons
  staticFilters?: {
    mediaType?: string[];
    hidden?: boolean;
    status?: UserAnimeStatus | 'not_defined';
    sortBy?: SortColumn;
    sortDir?: SortDirection;
  };
}

export const VIEW_PRESETS: ViewPreset[] = [
  {
    key: 'new_season_strict',
    label: 'New Season (Strict)',
    description: 'Animes from the current season only',
    seasonStrategy: 'current',
    staticFilters: { hidden: false }
  },
  {
    key: 'new_season',
    label: 'New Season',
    description: 'Current & previous season',
    seasonStrategy: 'current_previous',
    staticFilters: { hidden: false }
  },
  {
    key: 'next_season',
    label: 'Next Season',
    description: 'Animes that will air in the next season',
    seasonStrategy: 'next',
    staticFilters: { hidden: false }
  },
  {
    key: 'find_shows',
    label: 'Find Shows',
    description: 'Highest rated TV shows not in your list',
    seasonStrategy: null,
    staticFilters: { mediaType: ['tv'], hidden: false, sortBy: 'mean', sortDir: 'desc' }
  },
  { key: 'watching', label: 'Watching', description: 'Currently watching', seasonStrategy: null, staticFilters: { status: 'watching', hidden: false } },
  { key: 'completed', label: 'Completed', description: 'Completed shows', seasonStrategy: null, staticFilters: { status: 'completed', hidden: false } },
  { key: 'on_hold', label: 'On Hold', description: 'Shows on hold', seasonStrategy: null, staticFilters: { status: 'on_hold', hidden: false } },
  { key: 'dropped', label: 'Dropped', description: 'Shows you dropped', seasonStrategy: null, staticFilters: { status: 'dropped', hidden: false } },
  { key: 'plan_to_watch', label: 'Plan to Watch', description: 'Planned shows', seasonStrategy: null, staticFilters: { status: 'plan_to_watch', hidden: false } },
  { key: 'hidden', label: 'Hidden', description: 'Hidden shows only', seasonStrategy: null, staticFilters: { hidden: true } },
];

// Map a view to filter query parameter strings (CSV tokens)
export function mapViewToFilters(view: AnimeView): Record<string, any> {
  const preset = VIEW_PRESETS.find(p => p.key === view);
  if (!preset) return {};

  const filters: Record<string, string> = {};
  const seasonInfos = getSeasonInfos();
  if (preset.seasonStrategy) {
    if (preset.seasonStrategy === 'current') {
      filters.season = `${seasonInfos.current.year}-${seasonInfos.current.season}`;
    } else if (preset.seasonStrategy === 'current_previous') {
      filters.season = `${seasonInfos.current.year}-${seasonInfos.current.season},${seasonInfos.previous.year}-${seasonInfos.previous.season}`;
    } else if (preset.seasonStrategy === 'next') {
      filters.season = `${seasonInfos.next.year}-${seasonInfos.next.season}`;
    }
  }
  if (preset.staticFilters) {
    const sf = preset.staticFilters;
    if (sf.mediaType && sf.mediaType.length > 0) filters.mediaType = sf.mediaType.join(',');
    if (sf.hidden !== undefined) filters.hidden = sf.hidden ? 'true' : 'false';
    if (sf.status) filters.status = sf.status;
    if (sf.sortBy) filters.sortBy = sf.sortBy;
    if (sf.sortDir) filters.sortDir = sf.sortDir;
  }
  return filters;
}

// You can add other client-safe anime utility functions here

