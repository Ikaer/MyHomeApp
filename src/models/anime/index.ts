/**
 * Anime-related interfaces and types
 * Based on MyAnimeList API structure and user extensions
 */

// Base MAL anime data (from API)
export interface MALAnime {
  id: number;
  title: string;
  main_picture?: {
    medium: string;
    large: string;
  };
  alternative_titles?: {
    synonyms: string[];
    en: string;
    ja: string;
  };
  start_date?: string;
  end_date?: string;
  synopsis?: string;
  mean?: number; // MAL score rating
  rank?: number;
  popularity?: number;
  num_list_users?: number;
  num_scoring_users?: number;
  nsfw?: string;
  genres: Genre[];
  created_at?: string;
  updated_at?: string;
  media_type?: string;
  status?: string; // 'finished_airing' | 'currently_airing' | 'not_yet_aired'
  my_list_status?: {
    status: string; // 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch'
    score: number;
    num_episodes_watched: number;
    is_rewatching: boolean;
    updated_at: string;
  };
  num_episodes?: number;
  start_season?: {
    year: number;
    season: string; // 'winter' | 'spring' | 'summer' | 'fall'
  };
  broadcast?: {
    day_of_the_week: string;
    start_time: string;
  };
  source?: string;
  average_episode_duration?: number;
  rating?: string;
  pictures: Picture[];
  background?: string;
  related_anime: RelatedAnime[];
  studios: Studio[];
}

export interface Genre {
  id: number;
  name: string;
}

export interface Picture {
  medium: string;
  large: string;
}

export interface RelatedAnime {
  node: {
    id: number;
    title: string;
    main_picture?: {
      medium: string;
      large: string;
    };
  };
  relation_type: string;
  relation_type_formatted: string;
}

export type UserAnimeStatus = 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch';

export interface Studio {
  id: number;
  name: string;
}

// User extension data
export interface AnimeProvider {
  name: string;
  url: string;
}

export interface AnimeExtension {
  providers: AnimeProvider[];
  notes: string;
}

// Combined data for display
export interface AnimeWithExtensions extends MALAnime {
  extensions?: AnimeExtension;
  hidden?: boolean;
}

// MAL Authentication
export interface MALAuthData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  created_at: number; // timestamp
}

export interface MALUser {
  id: number;
  name: string;
  picture?: string;
}

export interface MALAuthState {
  isAuthenticated: boolean;
  user?: MALUser;
  token?: MALAuthData;
}

// API Response types
export interface AnimeSeasonResponse {
  data: Array<{
    node: MALAnime;
  }>;
  paging?: {
    next?: string;
    previous?: string;
  };
}

// Sync metadata
export interface SyncMetadata {
  lastSyncDate: string;
  currentSeason: {
    year: number;
    season: string;
  };
  previousSeason: {
    year: number;
    season: string;
  };
  totalAnimeCount: number;
}

// Filter and sort options
export type SortColumn = 'title' | 'mean' | 'start_date' | 'status' | 'num_episodes' | 'rank' | 'popularity' | 'num_list_users' | 'num_scoring_users' | 'delta_mean' | 'delta_rank' | 'delta_popularity' | 'delta_num_list_users' | 'delta_num_scoring_users';
export type SortDirection = 'asc' | 'desc';

// View types
export type AnimeView = 'new_season' | 'new_season_strict' | 'next_season' | 'find_shows' | 'watching' | 'completed' | 'hidden' | 'dropped' | 'on_hold' | 'plan_to_watch';

export interface AnimeFilters {
  search?: string;
  genres?: string[];
  status?: string[];
  minScore?: number;
}

export interface AnimeSortOptions {
  column: SortColumn;
  direction: SortDirection;
}

// Score history tracking
export interface AnimeScoreHistory {
  mean?: number;
  rank?: number;
  popularity?: number;
  num_list_users?: number;
  num_scoring_users?: number;
  my_list_status?: {
    status: string;
    score: number;
    num_episodes_watched: number;
    is_rewatching: boolean;
    updated_at: string;
  };
}

export type AnimeScoresHistoryData = Record<number, Record<string, AnimeScoreHistory>>;
