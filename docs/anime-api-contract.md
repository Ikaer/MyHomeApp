# Anime API Contract (New Filter-based System)

Status: Draft
Branch: `new-ui-api-system`
Effective: 2025-11-16

## Overview

This document defines the contract for the new filter-first Anime API. The legacy server-side "view" concept is being removed. Clients compose results with explicit filters and sort controls.

Notes:
- Backward compatibility with `view` is not required. The parameter is considered deprecated and will be removed.
- The `hasUserMalStatus` parameter is removed. Use `status=not_defined` for discovery scenarios.
- Default pagination limit is 200 unless `limit` is provided.
- Responses default to compact mode (heavy fields omitted) unless `full=true`.

---

## Endpoint: GET /api/anime/animes

Return a filtered, sorted, optionally paginated list of anime with user extensions.

### Query Parameters

- `search` (string, optional)
  - Case-insensitive match against `title` and English alternative title.

- `genres` (csv, optional)
  - Example: `genres=Action,Comedy`

- `status` (csv of user statuses, optional)
  - Allowed values: `watching,completed,on_hold,dropped,plan_to_watch,not_defined`
  - `not_defined` means items without `my_list_status`.

- `minScore` (number, optional)
- `maxScore` (number, optional)

- `season` (csv of `YYYY-season` tokens, optional)
  - Season names: `winter,spring,summer,fall` (accepts `autumn` as `fall`)
  - Example: `season=2025-winter,2024-fall`

- `mediaType` (csv of media types, optional)
  - Allowed: `tv,movie,ona,ova,special,music`

- `hidden` (boolean, optional)
  - `true` = only hidden, `false` = only non-hidden (default behavior when omitted: non-hidden).

- `sortBy` (string, optional; default `mean`)
  - See SortColumn enum below.

- `sortDir` (string, optional; default `desc`)
  - `asc | desc`

- `limit` (number | `all`, optional)
  - Default: `200`; safety cap: `1000` when using a number.

- `offset` (number, optional)
  - Default: `0`.

- `full` (boolean, optional)
  - `true` returns full MAL payload including heavy fields; default compact removes heavy text/arrays.

### Response

```json
{
  "animes": [/* AnimeWithExtensions (compact or full) */],
  "total": 1234,
  "filters": {
    "search": "..." | null,
    "season": "..." | null,  
    "mediaType": "..." | null,
    "hidden": "true|false" | null,
    "genres": "..." | null,
    "status": "..." | null,
    "minScore": "..." | null,
    "maxScore": "..." | null
  },
  "sort": {
    "column": "mean",
    "direction": "desc"
  },
  "page": {
    "limit": 200,
    "offset": 0,
    "count": 200
  },
  "mode": "compact" | "full"
}
```

- `total`: count before pagination.
- `page.count`: number of items returned in this page.
- `mode`: compact strips heavy fields; full returns all.

### Examples

- Current season only, TV, score >= 7, sort by score desc (first page):
```
GET /api/anime/animes?season=2025-winter&mediaType=tv&minScore=7&sortBy=mean&sortDir=desc
```

- Find shows (discovery): only not in MAL list, TV:
```
GET /api/anime/animes?status=not_defined&mediaType=tv&sortBy=mean&sortDir=desc
```

- Hidden only, sorted by mean desc:
```
GET /api/anime/animes?hidden=true&sortBy=mean&sortDir=desc
```

- Full payload, all items (use with care):
```
GET /api/anime/animes?limit=all&full=true
```

---

## Types (reference)

```
SeasonName = 'winter' | 'spring' | 'summer' | 'fall'
SeasonInfo = { year: number; season: SeasonName }
MediaType = 'tv' | 'movie' | 'ona' | 'ova' | 'special' | 'music'

AnimeFilters = {
  search?: string
  genres?: string[]
  status?: Array<'watching'|'completed'|'on_hold'|'dropped'|'plan_to_watch'|'not_defined'>
  minScore?: number
  maxScore?: number
  season?: SeasonInfo[]
  mediaType?: MediaType[]
  hidden?: boolean
}

SortColumn = 'title'|'mean'|'start_date'|'status'|'num_episodes'|'rank'|'popularity'|'num_list_users'|'num_scoring_users'|'delta_mean'|'delta_rank'|'delta_popularity'|'delta_num_list_users'|'delta_num_scoring_users'
SortDirection = 'asc' | 'desc'

AnimeListResponse = {
  animes: AnimeWithExtensions[]
  total: number
  filters: {
    search: string | null
    season: string | null
    mediaType: string | null
    hidden: string | null
    genres: string | null
    status: string | null
    minScore: string | null
    maxScore: string | null
  }
  sort: { column: SortColumn; direction: SortDirection }
  page: { limit: number | 'all'; offset: number; count: number }
  mode: 'full' | 'compact'
}
```

---

## Deprecations

- `view` (all values) — to be fully removed. Clients should apply presets by composing explicit filters.
- `hasUserMalStatus` — removed. Use `status=not_defined` for discovery.

---

## Error Responses

- 400 — invalid parameter format (e.g., bad token in `season`, expected `YYYY-season`).
- 405 — method not allowed.
- 500 — internal error.

```json
{ "error": "Failed to get anime list", "details": "..." }
```

---

## Implementation Notes

- Default limit is 200 unless client sets `limit` or `all`.
- Compact mode removes heavy fields (`synopsis`, `alternative_titles`, `genres`, `studios`, `background`, related arrays, etc.).
- The `season` parameter is a plain CSV string; no JSON encoding required.
