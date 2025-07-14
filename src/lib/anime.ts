import fs from 'fs';
import path from 'path';
import { MALAnime, AnimeExtension, AnimeWithExtensions, MALAuthData, MALUser, SyncMetadata } from '@/models/anime';

const DATA_PATH = process.env.DATA_PATH || '/app/data';
const ANIME_DATA_PATH = path.join(DATA_PATH, 'anime');

// File paths
const ANIME_MAL_FILE = path.join(ANIME_DATA_PATH, 'animes_MAL.json');
const ANIME_EXTENSIONS_FILE = path.join(ANIME_DATA_PATH, 'animes_extensions.json');
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
export function getAnimeWithExtensions(): AnimeWithExtensions[] {
  const malAnime = getAllMALAnime();
  const extensions = getAllAnimeExtensions();
  
  return Object.values(malAnime).map(anime => ({
    ...anime,
    extensions: extensions[anime.id.toString()]
  }));
}

export function getFilteredAnimeList(): AnimeWithExtensions[] {
  const allAnime = getAnimeWithExtensions();
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  
  // Determine current season
  const month = currentDate.getMonth() + 1; // getMonth() returns 0-11
  let currentSeason: string;
  if (month >= 1 && month <= 3) currentSeason = 'winter';
  else if (month >= 4 && month <= 6) currentSeason = 'spring';
  else if (month >= 7 && month <= 9) currentSeason = 'summer';
  else currentSeason = 'fall';
  
  // Determine previous season
  let prevYear = currentYear;
  let prevSeason: string;
  if (currentSeason === 'winter') { prevSeason = 'fall'; prevYear--; }
  else if (currentSeason === 'spring') prevSeason = 'winter';
  else if (currentSeason === 'summer') prevSeason = 'spring';
  else prevSeason = 'summer';
  
  return allAnime.filter(anime => {
    if (!anime.start_season) return false;
    
    const animeYear = anime.start_season.year;
    const animeSeason = anime.start_season.season;
    
    // Include all anime from current season (any status)
    if (animeYear === currentYear && animeSeason === currentSeason) {
      return true;
    }
    
    // Include anime from previous season that are still airing
    if (animeYear === prevYear && animeSeason === prevSeason && anime.status === 'currently_airing') {
      return true;
    }
    
    return false;
  });
}

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
