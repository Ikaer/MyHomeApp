import fs from 'fs';
import path from 'path';
import { MALAnime, AnimeExtension, AnimeWithExtensions, MALAuthData, MALUser, SyncMetadata, AnimeScoresHistoryData, AnimeView, AnimeUserPreferences, UserAnimeStatus } from '@/models/anime';
// Legacy view-specific filter utilities removed (fire-and-forget presets now handled client-side)

const DATA_PATH = process.env.DATA_PATH || '/app/data';
const ANIME_DATA_PATH = path.join(DATA_PATH, 'anime');

// File paths
const ANIME_MAL_FILE = path.join(ANIME_DATA_PATH, 'animes_MAL.json');
const ANIME_EXTENSIONS_FILE = path.join(ANIME_DATA_PATH, 'animes_extensions.json');
const ANIME_SCORES_HISTORY_FILE = path.join(ANIME_DATA_PATH, 'anime_scores_history.json');
const ANIME_HIDDEN_FILE = path.join(ANIME_DATA_PATH, 'animes_hidden.json');
const ANIME_USER_PREFS_FILE = path.join(ANIME_DATA_PATH, 'user_preferences.json');
const MAL_AUTH_FILE = path.join(ANIME_DATA_PATH, 'mal_auth.json');

// Utility function to ensure anime data directory exists
function ensureAnimeDataDirectory(): void {
  if (!fs.existsSync(ANIME_DATA_PATH)) {
    fs.mkdirSync(ANIME_DATA_PATH, { recursive: true, mode: 0o755 });
  }
}

// Utility function to safely read JSON files
function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return defaultValue;
  }
}

// Utility function to safely write JSON files
function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    ensureAnimeDataDirectory();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    throw error;
  }
}

// Hidden anime IDs operations
export function getHiddenAnimeIds(): number[] {
  return readJsonFile<number[]>(ANIME_HIDDEN_FILE, []);
}

export function addHiddenAnimeId(animeId: number): void {
  const hiddenIds = getHiddenAnimeIds();
  if (!hiddenIds.includes(animeId)) {
    hiddenIds.push(animeId);
    writeJsonFile(ANIME_HIDDEN_FILE, hiddenIds);
  }
}

export function removeHiddenAnimeId(animeId: number): void {
  let hiddenIds = getHiddenAnimeIds();
  hiddenIds = hiddenIds.filter(id => id !== animeId);
  writeJsonFile(ANIME_HIDDEN_FILE, hiddenIds);
}

// MAL Anime data operations
export function getAllMALAnime(): Record<string, MALAnime> {
  return readJsonFile(ANIME_MAL_FILE, {});
}

export function saveMALAnime(animeData: Record<string, MALAnime>): void {
  writeJsonFile(ANIME_MAL_FILE, animeData);
}

export function upsertMALAnime(newAnime: MALAnime[]): void {
  const existingAnime = getAllMALAnime();

  newAnime.forEach(anime => {
    existingAnime[anime.id.toString()] = anime;
  });

  saveMALAnime(existingAnime);
}

// Anime scores history operations
export function getAnimeScoresHistory(): AnimeScoresHistoryData {
  return readJsonFile(ANIME_SCORES_HISTORY_FILE, {});
}

export function updateAnimeScoresHistory(newScores: MALAnime[]): void {
  const history = getAnimeScoresHistory();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  newScores.forEach(anime => {
    if (!history[anime.id]) {
      history[anime.id] = {};
    }

    history[anime.id][today] = {
      mean: anime.mean,
      rank: anime.rank,
      popularity: anime.popularity,
      num_list_users: anime.num_list_users,
      num_scoring_users: anime.num_scoring_users,
      my_list_status: anime.my_list_status,
    };
  });

  writeJsonFile(ANIME_SCORES_HISTORY_FILE, history);
}

// Extension data operations
export function getAllAnimeExtensions(): Record<string, AnimeExtension> {
  return readJsonFile(ANIME_EXTENSIONS_FILE, {});
}

export function saveAnimeExtensions(extensions: Record<string, AnimeExtension>): void {
  writeJsonFile(ANIME_EXTENSIONS_FILE, extensions);
}

export function getAnimeExtension(malId: string): AnimeExtension | null {
  const extensions = getAllAnimeExtensions();
  return extensions[malId] || null;
}

export function saveAnimeExtension(malId: string, extension: AnimeExtension): void {
  const extensions = getAllAnimeExtensions();
  extensions[malId] = extension;
  saveAnimeExtensions(extensions);
}

export function deleteAnimeExtension(malId: string): void {
  const extensions = getAllAnimeExtensions();
  delete extensions[malId];
  saveAnimeExtensions(extensions);
}

// Combined data operations
let cachedAnime: AnimeWithExtensions[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60_000; // 60s

export function getAnimeWithExtensions(): AnimeWithExtensions[] {
  const now = Date.now();
  if (cachedAnime && (now - lastCacheTime) < CACHE_TTL_MS) {
    return cachedAnime;
  }
  const malAnime = getAllMALAnime();
  const extensions = getAllAnimeExtensions();
  const hiddenIds = getHiddenAnimeIds();
  cachedAnime = Object.values(malAnime).map(anime => ({
    ...anime,
    extensions: extensions[anime.id.toString()],
    hidden: hiddenIds.includes(anime.id)
  }));
  lastCacheTime = now;
  return cachedAnime;
}

// Deprecated: server-side view filtering removed. `view` parameter now only maps to explicit filters in API handler.

// Authentication operations
export function getMALAuthData(): { user: MALUser | null; token: MALAuthData | null } {
  const authData = readJsonFile(MAL_AUTH_FILE, { user: null, token: null });
  return authData;
}

export function saveMALAuthData(user: MALUser | null, token: MALAuthData | null): void {
  writeJsonFile(MAL_AUTH_FILE, { user, token });
}

export function clearMALAuthData(): void {
  saveMALAuthData(null, null);
}

export function isMALTokenValid(token: MALAuthData | null): boolean {
  if (!token) return false;

  const now = Date.now();
  const tokenExpiry = token.created_at + (token.expires_in * 1000);

  return now < tokenExpiry;
}

// Sync metadata operations
export function getSyncMetadata(): SyncMetadata | null {
  const malAnime = getAllMALAnime();
  const animeList = Object.values(malAnime);

  if (animeList.length === 0) return null;

  // Find the most recent sync by looking at updated_at timestamps
  const mostRecent = animeList.reduce((latest, anime) => {
    if (!anime.updated_at) return latest;
    if (!latest.updated_at) return anime;
    return new Date(anime.updated_at) > new Date(latest.updated_at) ? anime : latest;
  });

  if (!mostRecent.updated_at) return null;

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  let currentSeason: string;
  if (month >= 1 && month <= 3) currentSeason = 'winter';
  else if (month >= 4 && month <= 6) currentSeason = 'spring';
  else if (month >= 7 && month <= 9) currentSeason = 'summer';
  else currentSeason = 'fall';

  let prevYear = currentYear;
  let prevSeason: string;
  if (currentSeason === 'winter') { prevSeason = 'fall'; prevYear--; }
  else if (currentSeason === 'spring') prevSeason = 'winter';
  else if (currentSeason === 'summer') prevSeason = 'spring';
  else prevSeason = 'summer';

  return {
    lastSyncDate: mostRecent.updated_at,
    currentSeason: { year: currentYear, season: currentSeason },
    previousSeason: { year: prevYear, season: prevSeason },
    totalAnimeCount: animeList.length
  };
}

// User preferences operations
export function getAnimeUserPreferences(): AnimeUserPreferences {
  const defaultPreferences: AnimeUserPreferences = {
    // Sort defaults
    sortBy: 'mean',
    sortDir: 'desc',
    
    // Filter defaults
    statusFilters: ['watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch', 'not_defined'],
    searchQuery: '',
    seasons: [],
    mediaTypes: [],
    hiddenOnly: false,
    minScore: null,
    maxScore: null,
    
    // Display defaults
    evolutionPeriod: '1w',
    imageSize: 1,
    visibleColumns: {
      score: true,
      scoreDelta: true,
      rank: true,
      rankDelta: true,
      popularity: true,
      popularityDelta: true,
      users: true,
      usersDelta: true,
      scorers: true,
      scorersDelta: true,
    },
    
    // UI state defaults (sidebar sections)
    sidebarExpanded: {
      account: true,
      sync: true,
      views: true,
      display: true,
      filters: true,
      sort: true,
      stats: true,
    },
    
    lastUpdated: new Date().toISOString()
  };

  return readJsonFile<AnimeUserPreferences>(ANIME_USER_PREFS_FILE, defaultPreferences);
}

export function saveAnimeUserPreferences(prefs: Partial<AnimeUserPreferences>): void {
  const currentPrefs = getAnimeUserPreferences();
  const updatedPrefs: AnimeUserPreferences = {
    ...currentPrefs,
    ...prefs,
    lastUpdated: new Date().toISOString()
  };
  writeJsonFile(ANIME_USER_PREFS_FILE, updatedPrefs);
}

// Personal status sync operations
interface MALListStatus {
  status: string;
  score: number;
  num_episodes_watched: number;
  is_rewatching: boolean;
  updated_at: string;
}

interface PersonalStatusUpdateResult {
  updated: boolean;
  changes: string[];
}

/**
 * Update personal status for a single anime if it exists and differs from current state.
 * Does NOT insert new anime - only updates existing ones.
 */
export function updatePersonalStatus(
  animeId: number,
  newListStatus: MALListStatus
): PersonalStatusUpdateResult {
  const existingAnime = getAllMALAnime();
  const animeKey = animeId.toString();

  // Anime doesn't exist locally - don't insert it
  if (!existingAnime[animeKey]) {
    return { updated: false, changes: [] };
  }

  const anime = existingAnime[animeKey];
  const changes: string[] = [];

  // If anime doesn't have personal status yet, initialize it
  if (!anime.my_list_status) {
    anime.my_list_status = {
      status: newListStatus.status,
      score: newListStatus.score,
      num_episodes_watched: newListStatus.num_episodes_watched,
      is_rewatching: newListStatus.is_rewatching,
      updated_at: newListStatus.updated_at,
    };
    changes.push('initialized');
  } else {
    // Compare each field and track changes
    if (anime.my_list_status.status !== newListStatus.status) {
      changes.push(`status: ${anime.my_list_status.status} -> ${newListStatus.status}`);
      anime.my_list_status.status = newListStatus.status;
    }

    if (anime.my_list_status.score !== newListStatus.score) {
      changes.push(`score: ${anime.my_list_status.score} -> ${newListStatus.score}`);
      anime.my_list_status.score = newListStatus.score;
    }

    if (anime.my_list_status.num_episodes_watched !== newListStatus.num_episodes_watched) {
      changes.push(
        `episodes: ${anime.my_list_status.num_episodes_watched} -> ${newListStatus.num_episodes_watched}`
      );
      anime.my_list_status.num_episodes_watched = newListStatus.num_episodes_watched;
    }

    if (anime.my_list_status.is_rewatching !== newListStatus.is_rewatching) {
      changes.push(`rewatching: ${anime.my_list_status.is_rewatching} -> ${newListStatus.is_rewatching}`);
      anime.my_list_status.is_rewatching = newListStatus.is_rewatching;
    }

    // Always update updated_at timestamp
    anime.my_list_status.updated_at = newListStatus.updated_at;
  }

  // If changes were made, save
  if (changes.length > 0) {
    existingAnime[animeKey] = anime;
    saveMALAnime(existingAnime);
    return { updated: true, changes };
  }

  return { updated: false, changes: [] };
}

interface BatchUpdateStats {
  totalProcessed: number;
  updated: number;
  skipped: number;
  failed: number;
  updates: Array<{ animeId: number; changes: string[] }>;
}

/**
 * Apply personal status updates to multiple anime.
 * Only updates existing anime, never inserts new ones.
 */
export function updatePersonalStatusBatch(
  updates: Array<{ animeId: number; listStatus: MALListStatus }>
): BatchUpdateStats {
  const stats: BatchUpdateStats = {
    totalProcessed: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    updates: [],
  };

  for (const update of updates) {
    try {
      const result = updatePersonalStatus(update.animeId, update.listStatus);
      stats.totalProcessed++;

      if (result.updated) {
        stats.updated++;
        stats.updates.push({ animeId: update.animeId, changes: result.changes });
      } else {
        stats.skipped++;
      }
    } catch (error) {
      stats.failed++;
      console.error(`Failed to update personal status for anime ${update.animeId}:`, error);
    }
  }

  return stats;
}
