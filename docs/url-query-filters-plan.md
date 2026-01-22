# URL Query-Controlled Anime Filters Plan

**Date:** January 19, 2026  
**Status:** ✅ Implemented

## Overview

Replace server-side view/preferences persistence with a fully URL-controlled filter/sort system. Empty URLs redirect to a configurable default preset (new_season_strict). All filter state lives in the URL with short param keys and values for compact, shareable links. No localStorage or server state for filters—**URL is the single source of truth**.

Browser back/forward navigation is supported via `router.push` for all filter changes.

---

## URL Param Schema

### Filter & Sort Parameters

| Param | Meaning | Values | Example |
|-------|---------|--------|---------|
| `s` | status | `w`,`c`,`h`,`d`,`p`,`n` (comma-sep) | `s=w,c` |
| `q` | search | string | `q=frieren` |
| `sn` | seasons | `YYYYx` (w/sp/su/f, comma-sep) | `sn=2026w,2025f` |
| `mt` | mediaType | `tv`,`movie`,`ova`,`ona`,`special` (comma-sep) | `mt=tv` |
| `h` | hidden | `1` (omit if false) | `h=1` |
| `min` | minScore | number | `min=7` |
| `max` | maxScore | number | `max=10` |
| `so` | sort | see codes below | `so=m` |
| `d` | direction | `a` (asc), `d` (desc) | `d=d` |

### Display Parameters

| Param | Meaning | Values | Example |
|-------|---------|--------|---------|
| `img` | imageSize | `1`,`2`,`3` | `img=2` |
| `cols` | visibleColumns | see codes below (comma-sep) | `cols=sc,r,p` |
| `ev` | evolutionPeriod | `1w`,`1m`,`3m` | `ev=1w` |
| `sb` | sidebarExpanded | section codes (comma-sep) | `sb=f,so,c` |

### Visible Columns Codes

| Code | Column |
|------|--------|
| `sc` | score |
| `scd` | scoreDelta |
| `r` | rank |
| `rd` | rankDelta |
| `p` | popularity |
| `pd` | popularityDelta |
| `u` | users |
| `ud` | usersDelta |
| `sr` | scorers |
| `srd` | scorersDelta |

### Sidebar Section Codes

| Code | Section |
|------|---------|
| `v` | views (presets) |
| `f` | filters |
| `so` | sort & order |
| `c` | columns |
| `d` | display |

### Sort Column Codes

| Code | Column |
|------|--------|
| `t` | title |
| `m` | mean |
| `sd` | start_date |
| `st` | status |
| `ep` | num_episodes |
| `r` | rank |
| `p` | popularity |
| `lu` | num_list_users |
| `su` | num_scoring_users |
| `dm` | delta_mean |
| `dr` | delta_rank |
| `dp` | delta_popularity |
| `dlu` | delta_num_list_users |
| `dsu` | delta_num_scoring_users |

### Status Codes

| Code | Status |
|------|--------|
| `w` | watching |
| `c` | completed |
| `h` | on_hold |
| `d` | dropped |
| `p` | plan_to_watch |
| `n` | not_defined |

### Season Format

Seasons are encoded as `YYYYx` where `x` is:
- `w` = winter
- `sp` = spring
- `su` = summer
- `f` = fall

Example: `sn=2026w,2025f` = Winter 2026 and Fall 2025

---

## Default Behavior

When user navigates to `/anime` with no query params, redirect to:

```
/anime?sn=2026w&mt=tv&so=m&d=d
```

This corresponds to the "new_season_strict" preset (current season, TV only, sorted by mean descending).

The default is configurable via the `DEFAULT_PRESET_URL` constant in `src/lib/animeUrlParams.ts`.

---

## Implementation Steps

### Step 1: Create `src/lib/animeUrlParams.ts`

Define:
- Short param key constants
- Bidirectional maps for encoding/decoding:
  - Status codes (`w` ↔ `watching`)
  - Season format (`2026w` ↔ `{year: 2026, season: 'winter'}`)
  - Sort column codes (`m` ↔ `mean`)
  - Direction codes (`a` ↔ `asc`)
- `encodeFiltersToUrl(filters): string` — converts filter state to URL query string
- `decodeUrlToFilters(query): FilterState` — parses URL query into filter state
- `encodeDisplayToUrl(display): string` — converts display settings to URL query string
- `decodeUrlToDisplay(query): DisplayState` — parses URL query into display settings
- `DEFAULT_PRESET_URL` constant
- `hasFilterParams(query): boolean` — checks if URL has any filter params

### Step 2: Create `src/hooks/useAnimeUrlState.ts`

Hook responsibilities:
1. On mount: if URL has no filter params, redirect to `DEFAULT_PRESET_URL` via `router.push`
2. Parse short URL params into full filter state and display settings using decode functions
3. Provide `updateFilters(partialFilters)` that encodes and updates URL via `router.push` (shallow routing)
4. Provide `updateDisplay(partialDisplay)` that encodes and updates URL via `router.push` (shallow routing)
5. Return `{ filters, display, updateFilters, updateDisplay, isReady }`

Use `router.push` (not `replace`) to enable browser back/forward navigation through filter history.

### Step 3: Refactor `src/pages/anime.tsx`

- Remove all filter/sort state variables (`statusFilters`, `searchQuery`, `seasons`, `mediaTypes`, `hiddenOnly`, `minScore`, `maxScore`, `sortBy`, `sortDir`)
- Remove all display state variables (`imageSize`, `visibleColumns`, `evolutionPeriod`, `sidebarExpanded`)
- Replace with `useAnimeUrlState()` hook
- Remove `loadPreferences()` calls entirely
- Remove `savePreferences()` calls entirely
- **Delete preferences API usage completely** — all state is in URL

### Step 4: Update `src/components/anime/sidebar/ViewsSection.tsx`

- Preset buttons navigate via `router.push('/anime?...')` with encoded params
- Use `encodeFiltersToUrl()` from `animeUrlParams.ts`
- Remove calls to state setters like `handleApplyView()`

### Step 5: Update Sidebar Filter Components

**FiltersSection.tsx:**
- Wire filter controls to call `updateFilters()` from URL hook
- Remove direct state setter props

**SortOrderSection.tsx:**
- Wire sort controls to call `updateFilters()` from URL hook
- Remove direct state setter props

**ColumnsSection.tsx (if exists):**
- Wire column visibility to call `updateDisplay()` from URL hook

**DisplaySection.tsx (if exists):**
- Wire imageSize, evolutionPeriod to call `updateDisplay()` from URL hook

### Step 6: Delete `AnimeUserPreferences` and Preferences API

In `src/models/anime/index.ts`:
- Remove `AnimeUserPreferences` interface entirely (or keep as deprecated reference)
- Remove `ImageSize`, `VisibleColumns` types if only used by preferences (keep if used elsewhere)

In `src/pages/api/anime/preferences.ts`:
- **Delete this file entirely** — no server-side preferences needed

In `data/anime/user_preferences.json`:
- **Delete this file** — no longer used

### Step 7: Clean `src/pages/api/anime/animes/index.ts`

- Remove `view` parameter handling
- Remove `mapViewToFilters` import
- API accepts only explicit long-form query params
- Frontend translates short URL params to long API params before fetching

### Step 8: Clean Up View Helpers

In `src/lib/animeUtils.ts`:
- Remove or deprecate `mapViewToFilters`
- Keep `VIEW_PRESETS` as reference data for generating preset URLs
- Remove `animeViewsHelper` if unused

### Step 9: Documentation

Update this document with final implementation details and any discovered edge cases.

---

## Example URLs

| Preset | URL |
|--------|-----|
| New Season Strict | `/anime?sn=2026w&mt=tv&so=m&d=d` |
| New Season | `/anime?sn=2026w,2025f&mt=tv&so=m&d=d` |
| Next Season | `/anime?sn=2026sp&mt=tv&so=m&d=d` |
| Watching | `/anime?s=w&so=t&d=a` |
| Completed | `/anime?s=c&so=t&d=a` |
| On Hold | `/anime?s=h&so=t&d=a` |
| Dropped | `/anime?s=d&so=t&d=a` |
| Plan to Watch | `/anime?s=p&so=t&d=a` |
| Find Shows | `/anime?s=n&mt=tv&so=m&d=d` |
| Hidden | `/anime?h=1&so=t&d=a` |

### Full URL with Display Settings

```
/anime?sn=2026w&mt=tv&so=m&d=d&img=2&cols=sc,scd,r,p&ev=1w&sb=f,so
```

This URL sets:
- Filters: Winter 2026, TV only, sorted by mean descending
- Display: Medium images, show score/scoreDelta/rank/popularity columns, 1 week evolution period
- Sidebar: Filters and Sort sections expanded

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser URL                              │
│   /anime?sn=2026w&mt=tv&so=m&d=d&img=2&cols=sc,r&ev=1w&sb=f     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    useAnimeUrlState Hook                         │
│  - Decode URL params to filter state + display settings         │
│  - Redirect empty URL to DEFAULT_PRESET_URL                     │
│  - Provide updateFilters() → encodes & router.push              │
│  - Provide updateDisplay() → encodes & router.push              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       anime.tsx Page                             │
│  - Consumes { filters, display, updateFilters, updateDisplay }  │
│  - Passes filters/display to sidebar components                 │
│  - Builds API query from filters (long-form params)             │
│  - NO SERVER PREFERENCES — all state from URL                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API: /api/anime/animes                        │
│  - Receives long-form query params                              │
│  - Filters and sorts anime list                                 │
│  - Returns AnimeListResponse                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Migration Notes

1. **Breaking Change:** All server-side preferences are removed. Users lose any saved preferences—they must reconfigure via URL or use preset buttons.

2. **Bookmarks:** Users with old bookmarks to `/anime` will be redirected to the default preset. Old bookmarks with `?view=watching` will break.

3. **Testing:** Verify browser back/forward works correctly through filter AND display setting changes.

4. **Files to Delete:**
   - `src/pages/api/anime/preferences.ts`
   - `data/anime/user_preferences.json`

---

## Future Enhancements (Out of Scope)

- Shareable preset links with custom names
- URL shortener integration for very long filter combinations
