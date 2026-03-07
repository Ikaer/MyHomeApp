/**
 * Anime-specific JSON extractor for animes_MAL.json.
 *
 * The file is an object keyed by MAL ID. Each record is converted into a
 * compact natural-language text that captures the semantically useful fields
 * (title, genres, synopsis, studios, user status + score).
 *
 * One text = one Qdrant point (no chunking — records are short enough).
 * Synopsis is truncated to keep each record under ~1 500 characters.
 */

import fs from 'fs';

// Keep synopses short so each record stays well under the 2 000-char chunk limit.
const MAX_SYNOPSIS_CHARS = 800;

const MY_STATUS_LABELS: Record<string, string> = {
  watching:      'currently watching',
  completed:     'completed',
  on_hold:       'on hold',
  dropped:       'dropped',
  plan_to_watch: 'plan to watch',
};

interface AnimeRecord {
  id?: number;
  title: string;
  alternative_titles?: { en?: string; synonyms?: string[] };
  synopsis?: string;
  mean?: number;
  rank?: number;
  genres?: { id: number; name: string }[];
  studios?: { id: number; name: string }[];
  start_season?: { year: number; season: string };
  source?: string;
  media_type?: string;
  num_episodes?: number;
  my_list_status?: {
    status: string;
    score: number;
    num_episodes_watched: number;
    is_rewatching: boolean;
  };
}

export interface AnimeSegment {
  text: string;
  /** MAL ID as string — used as a stable Qdrant point ID seed */
  recordId: string;
}

export function extractAnimeRecords(filePath: string): AnimeSegment[] {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw) as Record<string, AnimeRecord>;

  const segments: AnimeSegment[] = [];

  const totalRecords = Object.keys(data).length;
  console.log(`[RAG ingest][animeData] Parsed ${totalRecords} records from ${filePath}`);

  for (const [key, anime] of Object.entries(data)) {
    const parts: string[] = [];

    // ── Title ────────────────────────────────────────────────────────────────
    const enTitle = anime.alternative_titles?.en;
    if (enTitle && enTitle !== anime.title) {
      parts.push(`Title: ${anime.title} (English: ${enTitle})`);
    } else {
      parts.push(`Title: ${anime.title}`);
    }

    // ── My list status ───────────────────────────────────────────────────────
    if (anime.my_list_status) {
      const s = anime.my_list_status;
      const label = MY_STATUS_LABELS[s.status] ?? s.status;
      const score = s.score > 0 ? ` — my score: ${s.score}/10` : '';
      const eps   = s.num_episodes_watched > 0 ? `, watched ${s.num_episodes_watched} ep.` : '';
      const rewatching = s.is_rewatching ? ' (rewatching)' : '';
      parts.push(`My list: ${label}${score}${eps}${rewatching}`);
    }

    // ── MAL community data ───────────────────────────────────────────────────
    const community: string[] = [];
    if (anime.mean)       community.push(`MAL score: ${anime.mean}`);
    if (anime.rank)       community.push(`rank #${anime.rank}`);
    if (community.length) parts.push(community.join(', '));

    // ── Genres ───────────────────────────────────────────────────────────────
    if (anime.genres && anime.genres.length > 0) {
      parts.push(`Genres: ${anime.genres.map(g => g.name).join(', ')}`);
    }

    // ── Studios ──────────────────────────────────────────────────────────────
    if (anime.studios && anime.studios.length > 0) {
      parts.push(`Studios: ${anime.studios.map(s => s.name).join(', ')}`);
    }

    // ── Broadcast info ───────────────────────────────────────────────────────
    const meta: string[] = [];
    if (anime.media_type)              meta.push(anime.media_type.toUpperCase());
    if (anime.start_season)            meta.push(`${anime.start_season.season} ${anime.start_season.year}`);
    if (anime.num_episodes)            meta.push(`${anime.num_episodes} episodes`);
    if (anime.source)                  meta.push(`source: ${anime.source.replace(/_/g, ' ')}`);
    if (meta.length)                   parts.push(meta.join(' · '));

    // ── Synopsis (truncated) ─────────────────────────────────────────────────
    if (anime.synopsis) {
      const syn = anime.synopsis.length > MAX_SYNOPSIS_CHARS
        ? anime.synopsis.slice(0, MAX_SYNOPSIS_CHARS) + '…'
        : anime.synopsis;
      parts.push(`Synopsis: ${syn}`);
    }

    segments.push({
      text: parts.join('\n'),
      recordId: String(anime.id ?? key),
    });
  }

  console.log(`[RAG ingest][animeData] → ${segments.length} record(s) ready for embedding (${totalRecords - segments.length} skipped/empty)`);
  return segments;
}
