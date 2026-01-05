# Personal Status Sync Feature Enhancement Plan

**Date:** January 5, 2026  
**Feature:** Personal Anime Status Synchronization  
**Target:** Sync updates made directly on MyAnimeList website to the local database

---

## Executive Summary

The current sync feature fetches seasonal anime data from MAL. This plan extends it to also synchronize **personal status changes** that users make directly on the MAL website (status changes, episode count updates, rating changes) without inserting new anime into the system.

---

## Background

### Current Sync Behavior
- Fetches current, previous, and next seasonal anime from MAL API
- Upserts all anime data (creates new or updates existing records)
- Does NOT handle personal status updates made on MAL website directly

### New Requirement
- Add a secondary sync that fetches the user's personal animelist from MAL
- **Only update existing anime** in the local database
- **Never insert new anime** from the personal list
- Update only personal status fields when they differ from current local state:
  - `my_list_status.status` (watching, completed, on_hold, dropped, plan_to_watch)
  - `my_list_status.num_episodes_watched`
  - `my_list_status.score` (rating)

---

## Implementation Plan

### Phase 1: API Research & Specification

#### 1.1 MAL User Animelist Endpoint Research
- **Endpoint:** `GET https://api.myanimelist.net/v2/users/{username}/animelist`
- **Documentation:** https://myanimelist.net/apiconfig/references/api/v2#operation/users_user_id_animelist_get

**✅ VERIFIED:**
- ✅ Endpoint works with **username** (not user_id): `/users/ikaer/animelist`
- ✅ Response structure and pagination working correctly
- ✅ Pagination uses `offset` and `limit` parameters (limit=100 confirmed working)
- ✅ Maximum page size: 100 items per request
- ✅ `paging.next` provided in response for pagination

**Actual Response Structure:**
```json
{
  "data": [
    {
      "node": {
        "id": 31646,
        "title": "3-gatsu no Lion",
        "main_picture": {
          "medium": "https://...",
          "large": "https://..."
        },
        "my_list_status": {
          "status": "watching|completed|on_hold|dropped|plan_to_watch",
          "score": 0,
          "num_episodes_watched": 5,
          "is_rewatching": false,
          "updated_at": "2025-12-30T17:37:36+00:00"
        }
      }
    }
  ],
  "paging": {
    "next": "https://api.myanimelist.net/v2/users/ikaer/animelist?offset=5&fields=...&limit=5"
  }
}
```

**Note:** `main_picture` is always included even when not requested in fields parameter (MAL API behavior).

#### 1.2 Data Mapping
Map MAL response to local `MALAnime.my_list_status` structure:
```typescript
// MAL response field -> Local field
node.id                                  → MALAnime.id
node.my_list_status.status               → MALAnime.my_list_status.status
node.my_list_status.score                → MALAnime.my_list_status.score
node.my_list_status.num_episodes_watched → MALAnime.my_list_status.num_episodes_watched
node.my_list_status.is_rewatching        → MALAnime.my_list_status.is_rewatching
node.my_list_status.updated_at           → MALAnime.my_list_status.updated_at
```

### Phase 2: Fetch User Animelist Function

#### 2.1 Create `fetchUserAnimelist()` Function
**Location:** `src/pages/api/anime/sync.ts`

**Purpose:** Paginate through user's personal animelist and collect all entries

**Implementation Details:**
```typescript
async function fetchUserAnimelist(
  accessToken: string,
  username: string
): Promise<Array<{ animeId: number; listStatus: MyListStatus }>>
```

**Algorithm:**
1. Initialize empty array for results
2. Set offset = 0, limit = 100 (MAL API limit)
3. Loop:
   - Fetch page with current offset: `GET /v2/users/{username}/animelist?offset={offset}&limit={limit}&fields=id,title,my_list_status`
   - Extract anime ID and `my_list_status` from each `node` in response.data
   - Push to results array
   - If `paging.next` exists and returned items == limit, continue
   - Otherwise, break
4. Return all collected entries

**Error Handling:**
- Validate HTTP response status
- Log pagination progress
- Handle API rate limiting gracefully

#### 2.2 Required Query Parameters & Fields
**Fields to Request (minimal):**
```
fields=id,title,my_list_status
```

**Note:** Even with minimal fields, MAL includes `main_picture` in response. This is fine—we ignore it.

**Query String Example:**
```
?offset=0&limit=100&fields=id,title,my_list_status
```

---

### Phase 3: Status Update Logic

#### 3.1 Create `updatePersonalStatus()` Function
**Location:** `src/lib/anime.ts`

**Purpose:** Compare personal status from MAL with local database and update if different

**Signature:**
```typescript
export function updatePersonalStatus(
  animeId: number,
  newListStatus: UserListStatus
): { updated: boolean; changes: string[] }
```

**Logic:**
1. Fetch existing anime from local database by ID
2. If anime doesn't exist:
   - Log warning, return `{ updated: false, changes: [] }`
   - (Do NOT create new anime)
3. If anime exists:
   - Compare new status with existing `my_list_status`
   - Track what changed:
     - status (string comparison)
     - num_episodes_watched (number comparison)
     - score (number comparison)
   - If any differences found:
     - Update the anime's `my_list_status` fields
     - Return `{ updated: true, changes: [...] }`
   - If no differences:
     - Return `{ updated: false, changes: [] }`

**Data Structure for Comparison:**
```typescript
interface UserListStatus {
  status: string;
  score: number;
  num_episodes_watched: number;
  is_rewatching: boolean;
  updated_at: string;
}
```

#### 3.2 Bulk Update Function
**Purpose:** Apply personal status updates to entire list

**Signature:**
```typescript
export function updatePersonalStatusBatch(
  updates: Array<{ animeId: number; listStatus: UserListStatus }>
): { totalProcessed: number; updated: number; failed: number }
```

**Algorithm:**
1. Get current anime database
2. For each item in updates:
   - Call `updatePersonalStatus()`
   - Track results (updated/skipped/failed)
3. Save updated anime database to disk
4. Return summary statistics

---

### Phase 4: Integration into Sync Endpoint

#### 4.1 Modify `sync.ts` Handler
**Location:** `src/pages/api/anime/sync.ts`

**Changes:**
1. After seasonal anime sync completes, perform personal status sync
2. Call `fetchUserAnimelist()` with user token and user_id
3. Call `updatePersonalStatusBatch()` with results
4. Return enhanced response with personal status sync results

**Enhanced Response:**
```json
{
  "success": true,
  "seasonalSync": {
    "syncedCount": 100,
    "currentSeason": { "year": 2026, "season": "winter" }
  },
  "personalStatusSync": {
    "processed": 50,
    "updated": 5,
    "skipped": 45,
    "failed": 0,
    "changes": [
      { "animeId": 123, "changes": ["status", "score"] },
      ...
    ]
  },
  "metadata": {...}
}
```

#### 4.2 User ID Resolution
**RESOLVED:** Store **username** in auth data, not user ID

The MAL API endpoint requires username (string), not user_id (number):
- ✅ Works: `GET /v2/users/ikaer/animelist`
- ❌ Doesn't work: `GET /v2/users/4870356/animelist` (404 error)

**Action:** When syncing, retrieve username from the existing `MALUser` object stored in `mal_auth.json`
```typescript
const { user } = getMALAuthData();
const username = user?.name; // e.g., "ikaer"
```

---

### Phase 5: Testing & Validation

#### 5.1 Unit Tests
- [ ] Test `updatePersonalStatus()` function with various scenarios:
  - Anime not in database (should not insert)
  - Anime with no personal status (should not update)
  - Anime with status changes (should update)
  - Anime with only episode count change
  - Anime with only score change
  - Multiple fields changing

#### 5.2 Integration Tests
- [ ] Test `fetchUserAnimelist()` with mock MAL API responses
- [ ] Test pagination handling
- [ ] Test batch update with partial failures
- [ ] Test sync endpoint response structure

#### 5.3 Manual Testing
- [ ] Make changes on MAL website directly
- [ ] Run sync endpoint
- [ ] Verify local database reflects changes
- [ ] Verify no new anime were added
- [ ] Verify sync metadata includes personal status sync info

---

## Data Flow Diagram

```
┌─────────────────────────┐
│  POST /api/anime/sync   │
└────────────┬────────────┘
             │
             ├─► [Existing] Seasonal Sync
             │   ├─ fetchSeasonalAnime(current)
             │   ├─ fetchSeasonalAnime(previous)
             │   ├─ fetchSeasonalAnime(next)
             │   └─ upsertMALAnime() [Creates/updates]
             │
             └─► [NEW] Personal Status Sync
                 ├─ fetchUserAnimelist()
                 │  └─ GET /v2/users/{userId}/animelist
                 │     with pagination
                 │
                 └─ updatePersonalStatusBatch()
                    ├─ For each anime in personal list:
                    │  ├─ Find in local database
                    │  ├─ Compare my_list_status
                    │  └─ Update if different
                    │
                    └─ Save updated database
```

---

## Implementation Checklist

### Backend Implementation
- [x] **API Research:** ✅ Confirmed MAL user animelist endpoint response format
  - Uses **username**, not user_id
  - Max limit: 100 items per page
  - Pagination via offset parameter
  - Response includes `node.my_list_status` with all required fields
- [ ] **Create `fetchUserAnimelist()` function** in `sync.ts`
  - [ ] Handle pagination with offset/limit
  - [ ] Request fields: `id,title,my_list_status`
  - [ ] Extract anime ID and status from response
  - [ ] Add logging for pagination progress
  - [ ] Handle API errors gracefully
- [ ] **Create `updatePersonalStatus()` function** in `lib/anime.ts`
  - [ ] Compare fields (status, episodes, score, is_rewatching)
  - [ ] Track changes for logging
  - [ ] Return update results
  - [ ] Handle anime not in database (skip, don't insert)
- [ ] **Create `updatePersonalStatusBatch()` function** in `lib/anime.ts`
  - [ ] Batch process updates
  - [ ] Update local database
  - [ ] Return statistics (processed, updated, skipped)
- [ ] **Modify `sync.ts` handler**
  - [ ] Get username from `MALAuthData`
  - [ ] Call personal status sync after seasonal sync
  - [ ] Enhance response with personal status sync metrics
  - [ ] Add error handling for personal status sync

### Testing
- [ ] Unit tests for status update logic
- [ ] Integration tests for batch updates
- [ ] Manual testing with MAL website changes

### Documentation
- [ ] Update this plan with actual MAL API response format
- [ ] Add code comments documenting personal status sync flow
- [ ] Update project README if needed

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| MAL API changes | High | Document endpoint structure, add unit tests |
| Sync conflicts | Medium | Always prefer MAL source of truth for updates |
| Performance (large lists) | Medium | Implement efficient pagination and batching |
| Data loss | High | Back up before implementing, test extensively |
| User ID not available | Medium | Store in auth data or fetch from `/users/@me` |

---

## Success Criteria

1. **Correctness:** Personal status changes made on MAL website are reflected locally after sync
2. **No Insertion:** Personal status sync never creates new anime in local database
3. **Partial Updates:** Only changed fields are updated (not wholesale replacement)
4. **Logging:** Clear logging of what was synced and what changed
5. **Performance:** Sync completes in reasonable time even with large personal lists
6. **Robustness:** Graceful handling of API errors and edge cases

