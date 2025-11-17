# View-to-Filters Feasibility Analysis

## Overview
This document analyzes the feasibility of converting the current server-side view system to a client-side filter/sort system for the Anime feature in MyHomeApp.

**Goal**: Replace the hardcoded "view" concept on the backend with a flexible filter/sort system, allowing each view to be represented as a preset of filters and sorting options on the client side.

---

## Current View System

### Existing Views
The application currently has 10 distinct views:

1. **new_season_strict** - Current season only
2. **new_season** - Current + previous season (still airing)
3. **next_season** - Next season's anime
4. **find_shows** - Top-rated TV shows not in user's list
5. **watching** - Currently watching on MAL
6. **completed** - Completed on MAL
7. **on_hold** - Shows on hold
8. **dropped** - Dropped shows
9. **plan_to_watch** - Planned shows
10. **hidden** - Hidden shows

### Current Server-Side Implementation

The `filterAnimeByView()` function applies 4 different filter categories:

```typescript
export function filterAnimeByView(view: AnimeView = 'new_season'): AnimeWithExtensions[] {
  let animes = loadAllAnimes();
  animes = filterHiddenView(animes, view);      // Hidden/visible toggle
  animes = filterFindShowsView(animes, view);   // TV shows not in list
  animes = filterStatusView(animes, view);      // MAL status filtering
  animes = filterCalendarView(animes, view);    // Season-based filtering
  return animes;
}
```

---

## Detailed View Analysis

### 1. Calendar Views (Season-Based)

#### **new_season_strict**
- **Logic**: Anime from current season only
- **Filters Needed**:
  - `start_season.year` = current year
  - `start_season.season` = current season

#### **new_season**
- **Logic**: Anime from current OR previous season
- **Filters Needed**:
  - `start_season` IN [current season, previous season]
  
#### **next_season**
- **Logic**: Anime from next season only
- **Filters Needed**:
  - `start_season.year` = next year
  - `start_season.season` = next season

**Feasibility**: ✅ **FULLY FEASIBLE**
- Can be represented as date/season range filters
- Client calculates current/previous/next season (already has `getSeasonInfos()`)
- Simple equality checks

---

### 2. User Status Views

#### **watching** / **completed** / **on_hold** / **dropped** / **plan_to_watch**
- **Logic**: Filter by `my_list_status.status` field
- **Filters Needed**:
  - `my_list_status.status` = specific status

**Feasibility**: ✅ **FULLY FEASIBLE**
- Direct field equality check
- Already implemented as status filters in sidebar
- UI already has checkboxes for these statuses

---

### 3. Special Views

#### **find_shows**
- **Logic**: 
  ```typescript
  media_type === 'tv' 
  AND !my_list_status (no MAL status)
  AND top 200 by score (limit applied AFTER other filters)
  ```
- **Filters Needed**:
  - `media_type` = 'tv'
  - `has_user_mal_status` = false
- **Sort**: By `mean` (score) descending
- **Limit**: 200 results

**Feasibility**: ✅ **FULLY FEASIBLE**
- All conditions can be represented as filters
- Limit can be applied client-side after sort
- Note: Current API already applies this limit server-side

#### **hidden**
- **Logic**: Shows where `hidden` = true
- **Filters Needed**:
  - `hidden` = true

**Default Behavior** (all other views):
- **Logic**: Shows where `hidden` = false or undefined
- **Filters Needed**:
  - `hidden` != true

**Feasibility**: ✅ **FULLY FEASIBLE**
- Simple boolean field check
- Exclusive with other views (hidden view shows only hidden, others hide hidden)

---

## Filter Mapping Table

| View | Season Filter | Status Filter | Hidden Filter | Media Type | Has User MAL Status | Sort | Limit |
|------|---------------|---------------|---------------|------------|---------------------|------|-------|
| **new_season_strict** | Current season | (user choice) | false | - | - | - | - |
| **new_season** | Current OR Previous | (user choice) | false | - | - | - | - |
| **next_season** | Next season | (user choice) | false | - | - | - | - |
| **find_shows** | - | null | false | tv | false | mean desc | 200 |
| **watching** | - | watching | false | - | - | - | - |
| **completed** | - | completed | false | - | - | - | - |
| **on_hold** | - | on_hold | false | - | - | - | - |
| **dropped** | - | dropped | false | - | - | - | - |
| **plan_to_watch** | - | plan_to_watch | false | - | - | - | - |
| **hidden** | - | (user choice) | true | - | - | - | - |

---

## Required Filter Types

To support all views, we need these filter types:

### 1. **Season Filter** (Calendar views)
```typescript
interface SeasonFilter {
  type: 'season';
  seasons: Array<{ year: number; season: 'winter' | 'spring' | 'summer' | 'fall' }>;
}
```

### 2. **Status Filter** (Already exists!)
```typescript
interface StatusFilter {
  type: 'status';
  statuses: (UserAnimeStatus | 'not_defined')[];
}
```

### 3. **Hidden Filter**
```typescript
interface HiddenFilter {
  type: 'hidden';
  showHidden: boolean; // true = show only hidden, false = hide hidden items
}
```

### 4. **Media Type Filter** (find_shows)
```typescript
interface MediaTypeFilter {
  type: 'media_type';
  mediaTypes: string[]; // ['tv', 'movie', 'ova', etc.]
}
```

### 5. **Has User MAL Status Filter** (find_shows)
```typescript
interface HasUserMalStatusFilter {
  type: 'has_user_mal_status';
  hasStatus: boolean; // true = must have MAL status, false = must NOT have MAL status
}
```

### 6. **Score Range Filter** (already in API)
```typescript
interface ScoreFilter {
  type: 'score';
  min?: number;
  max?: number;
}
```

### 7. **Genre Filter** (already in API)
```typescript
interface GenreFilter {
  type: 'genre';
  genres: string[];
  matchMode: 'any' | 'all'; // any genre OR all genres
}
```

### 8. **Search Filter** (already exists)
```typescript
interface SearchFilter {
  type: 'search';
  query: string;
}
```

---

## Sort Requirements

Current API supports these sort columns:
- `title`, `mean`, `start_date`, `status`, `num_episodes`
- `rank`, `popularity`, `num_list_users`, `num_scoring_users`
- Delta fields: `delta_mean`, `delta_rank`, `delta_popularity`, `delta_num_list_users`, `delta_num_scoring_users`

**For views**:
- Most views: No specific sort required (user chooses)
- **find_shows**: Must sort by `mean` descending

---

## Proposed Filter System Architecture

### Filter State Structure
```typescript
interface AnimeFilterState {
  // Direct filters
  search?: string;
  season?: SeasonFilter;
  statuses?: (UserAnimeStatus | 'not_defined')[];
  hidden?: boolean; // true = show hidden, false/undefined = hide hidden
  mediaTypes?: string[];
  hasUserMalStatus?: boolean | null; // true = has MAL status, false = no MAL status, null = any
  minScore?: number;
  maxScore?: number;
  genres?: string[];
  
  // Sort
  sortBy?: SortColumn;
  sortDirection?: SortDirection;
  
  // Pagination
  limit?: number;
  offset?: number;
}
```

### View Preset System
```typescript
interface ViewPreset {
  id: AnimeView;
  label: string;
  description: string;
  filters: AnimeFilterState;
}

const VIEW_PRESETS: ViewPreset[] = [
  {
    id: 'new_season_strict',
    label: 'New Season (Strict)',
    description: 'Current season only',
    filters: {
      season: { seasons: [getCurrentSeason()] },
      hidden: false,
      statuses: ['watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch', 'not_defined']
    }
  },
  {
    id: 'find_shows',
    label: 'Find Shows',
    description: 'Top-rated TV shows not in your list',
    filters: {
      mediaTypes: ['tv'],
      hasUserMalStatus: false,
      hidden: false,
      sortBy: 'mean',
      sortDirection: 'desc',
      limit: 200
    }
  },
  // ... etc
];
```

---

## Implementation Strategy

### Phase 1: Backend API Enhancement
1. **Add new filter parameters** to `/api/anime/animes`:
   - `season`: JSON array of seasons `[{year, season}]`
   - `mediaType`: comma-separated media types
   - `hasUserMalStatus`: boolean (has MAL status or not)
   - `hidden`: boolean (show hidden items)
   
2. **Keep backward compatibility**:
   - Keep `view` parameter for now
   - If `view` is provided, map it to filters internally
   - Eventually deprecate `view` parameter

3. **Implement filter logic**:
   ```typescript
   // Pseudo-code
   if (season) {
     animeList = animeList.filter(a => 
       season.seasons.some(s => 
         a.start_season?.year === s.year && 
         a.start_season?.season === s.season
       )
     );
   }
   
   if (mediaType) {
     animeList = animeList.filter(a => 
       mediaTypes.includes(a.media_type)
     );
   }
   
   if (hasUserMalStatus !== null) {
     animeList = animeList.filter(a => 
       hasUserMalStatus ? !!a.my_list_status : !a.my_list_status
     );
   }
   
   if (hidden !== undefined) {
     animeList = animeList.filter(a => 
       hidden ? a.hidden === true : !a.hidden
     );
   }
   ```

### Phase 2: Frontend UI Overhaul

#### 2.1 Replace Column Click-to-Sort System

**Current Issue:**
- Column headers use cryptic acronyms (S, R, AS, AR, P, AP, U, AU, X, ΔX)
- Requires hovering for tooltips to understand meaning
- Takes up horizontal space
- Not user-friendly

**New Approach: Sort Control Panel**

Replace clickable column headers with a dedicated sort selector:

```
┌─────────────────────────────────────────────────────┐
│ Sort & Order                                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Sort by: [Score (Mean)          ▼]                │
│                                                     │
│  Order:   ○ Ascending   ● Descending               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Dropdown Options:**
```typescript
const SORT_OPTIONS = [
  { value: 'mean', label: 'Score (Mean)' },
  { value: 'rank', label: 'Rank' },
  { value: 'popularity', label: 'Popularity' },
  { value: 'num_list_users', label: 'Users Count' },
  { value: 'num_scoring_users', label: 'Scorers Count' },
  { value: 'delta_mean', label: 'Score Change (Δ)' },
  { value: 'delta_rank', label: 'Rank Change (Δ)' },
  { value: 'delta_popularity', label: 'Popularity Change (Δ)' },
  { value: 'delta_num_list_users', label: 'Users Change (Δ)' },
  { value: 'delta_num_scoring_users', label: 'Scorers Change (Δ)' },
  { value: 'title', label: 'Title (Alphabetical)' },
  { value: 'start_date', label: 'Air Date' },
  { value: 'num_episodes', label: 'Episodes Count' },
];
```

**Benefits:**
- ✅ No more cryptic acronyms
- ✅ Clear, readable labels
- ✅ Single location for sort control
- ✅ More space for table content
- ✅ Easy to add new sort options

**Table Headers (Simplified):**
- Remove sort icons (↑↓) from column headers
- Keep column headers as static labels
- Use full names or short but clear abbreviations
- Example: "Score", "Rank", "Popularity", "Users", "Scorers"

#### 2.2 Collapsible Sidebar Sections

**Current Issue:**
- Sidebar is cramped with many sections
- All sections expanded by default
- Hard to find specific controls

**New Approach: Collapsible Accordion Sections**

```
┌─────────────────────────────────────────┐
│ ▼ Account                     [expanded]│
│   Connected as: UserName                │
│   [Disconnect]                          │
├─────────────────────────────────────────┤
│ ▶ Data Sync                 [collapsed] │
├─────────────────────────────────────────┤
│ ▼ Views                       [expanded]│
│   [New Season (Strict)]                 │
│   [New Season]                          │
│   [Next Season]                         │
│   ... etc                               │
├─────────────────────────────────────────┤
│ ▶ Sort & Order              [collapsed] │
├─────────────────────────────────────────┤
│ ▼ Filters                     [expanded]│
│   Season Filter:                        │
│   [Current] [Previous] [Next]           │
│   ...                                   │
│   Status Filters:                       │
│   ☑ Watching  ☑ Completed               │
│   ...                                   │
├─────────────────────────────────────────┤
│ ▶ Display Options           [collapsed] │
├─────────────────────────────────────────┤
│ ▶ Column Visibility         [collapsed] │
├─────────────────────────────────────────┤
│ ▶ Stats & Evolution         [collapsed] │
└─────────────────────────────────────────┘
```

**Sidebar Sections (Reorganized):**

1. **Account** (collapsible, default: collapsed when connected)
   - MAL connection status
   - Connect/Disconnect button

2. **Data Sync** (collapsible, default: collapsed)
   - Sync Data button
   - Big Sync button
   - Last sync info

3. **Views** (collapsible, default: expanded)
   - Quick view buttons
   - Currently active view highlighted

4. **Sort & Order** (NEW, collapsible, default: expanded)
   - Sort by dropdown
   - Ascending/Descending radios

5. **Filters** (collapsible, default: expanded)
   - Search bar (moved here from main content)
   - Season filter (chip-based selector)
   - Status filters (checkboxes)
   - Media type filter (checkboxes)
   - Score range filter
   - Genre filter

6. **Display Options** (collapsible, default: collapsed)
   - Image size selector (x1, x2, x3)
   - Theme options (if any)

7. **Column Visibility** (collapsible, default: collapsed)
   - Toggle visibility for each stat column
   - Score, Rank, Popularity, Users, Scorers
   - Delta versions of each

8. **Stats & Evolution** (collapsible, default: collapsed)
   - Total anime count
   - Evolution period selector (1w, 1m, 3m, 1y)
   - Stats summary

**Implementation Pattern:**

```tsx
interface SidebarSection {
  id: string;
  title: string;
  defaultExpanded: boolean;
  content: React.ReactNode;
}

interface SidebarState {
  expandedSections: string[]; // IDs of expanded sections
}

const AnimeSidebar: React.FC<AnimeSidebarProps> = ({ ... }) => {
  const [expandedSections, setExpandedSections] = useState<string[]>(() => {
    // Load from user preferences
    const saved = loadUserPreference('sidebar_expanded_sections');
    return saved || ['views', 'filters', 'sort_order']; // Default expanded
  });

  const toggleSection = (sectionId: string) => {
    const newExpanded = expandedSections.includes(sectionId)
      ? expandedSections.filter(id => id !== sectionId)
      : [...expandedSections, sectionId];
    
    setExpandedSections(newExpanded);
    saveUserPreference('sidebar_expanded_sections', newExpanded);
  };

  const sections: SidebarSection[] = [
    {
      id: 'account',
      title: 'Account',
      defaultExpanded: false,
      content: <AccountSection {...accountProps} />
    },
    {
      id: 'sync',
      title: 'Data Sync',
      defaultExpanded: false,
      content: <SyncSection {...syncProps} />
    },
    {
      id: 'views',
      title: 'Views',
      defaultExpanded: true,
      content: <ViewsSection {...viewsProps} />
    },
    {
      id: 'sort_order',
      title: 'Sort & Order',
      defaultExpanded: true,
      content: <SortOrderSection {...sortProps} />
    },
    {
      id: 'filters',
      title: 'Filters',
      defaultExpanded: true,
      content: <FiltersSection {...filterProps} />
    },
    // ... etc
  ];

  return (
    <div className={styles.sidebar}>
      {sections.map(section => (
        <CollapsibleSection
          key={section.id}
          id={section.id}
          title={section.title}
          isExpanded={expandedSections.includes(section.id)}
          onToggle={() => toggleSection(section.id)}
        >
          {section.content}
        </CollapsibleSection>
      ))}
    </div>
  );
};
```

**CollapsibleSection Component:**

```tsx
interface CollapsibleSectionProps {
  id: string;
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  isExpanded,
  onToggle,
  children
}) => {
  return (
    <div className={styles.section}>
      <button 
        className={styles.sectionHeader}
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <span className={styles.sectionIcon}>
          {isExpanded ? '▼' : '▶'}
        </span>
        <h2 className={styles.sectionTitle}>{title}</h2>
      </button>
      
      {isExpanded && (
        <div className={styles.sectionContent}>
          {children}
        </div>
      )}
    </div>
  );
};
```

**CSS for Collapsible Sections:**

```css
.section {
  border-bottom: 1px solid var(--border-color);
}

.sectionHeader {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--bg-primary);
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  transition: background 0.2s;
}

.sectionHeader:hover {
  background: var(--bg-secondary);
}

.sectionIcon {
  font-size: 0.8rem;
  color: var(--text-secondary);
  transition: transform 0.2s;
}

.sectionTitle {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.sectionContent {
  padding: 1rem;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

#### 2.3 Main Content Area Improvements

**Remove from main area:**
- Search bar → Move to Filters section in sidebar

**Keep in main area:**
- Table with anime data
- Simplified column headers (no sort arrows)
- Error banners (if any)

**Simplified Layout:**
```
┌────────────────────────────────────────────────────────┐
│ [Error banner if any]                                  │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Image │ Title │ Status │ Episodes │ Season │... │  │
│  ├─────────────────────────────────────────────────┤  │
│  │       │       │        │          │        │    │  │
│  │  ...anime rows...                              │  │
│  │       │       │        │          │        │    │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Phase 2.4 Create FilterPanel component
   - Season selector (current, previous, next, custom, multiple)
   - Media type checkboxes
   - "Has MAL Status" toggle
   - "Show hidden" toggle
   - Score range slider
   - Genre multi-select
   
2. **Create ViewPreset system**:
   - Store presets in constants
   - "Apply View" button loads preset filters
   - User can modify after applying
   - Save custom presets to user preferences

3. **Update AnimeSidebar**:
   - Keep "Views" section for quick access
   - Add "Filters" section with all filter controls
   - Clicking a view = reset filters + apply preset

### Phase 3: Custom Views (Future)
1. **Allow users to save custom filter combinations**
2. **Store in user preferences**
3. **Add "Save Current Filters as View" button**

---

## Feasibility Conclusion

### ✅ **100% FEASIBLE**

**All 10 existing views can be perfectly translated to filter/sort combinations.**

### Breakdown:
- **Calendar views** (3): Season-based filters ✅
- **Status views** (5): Status field equality ✅
- **Special views** (2):
  - find_shows: Combination of filters + sort + limit ✅
  - hidden: Boolean field filter ✅

### Benefits of This Approach:
1. **Flexibility**: Users can combine filters freely
2. **Extensibility**: Easy to add new filter types
3. **Customization**: Users can create custom views
4. **Simplicity**: Backend only handles generic filters
5. **Performance**: Same performance (filters are equivalent)
6. **Backward Compatible**: Views become presets

### No Blockers:
- All view logic is deterministic
- No server-side state dependencies
- No complex joins or aggregations
- All data available in anime objects

---

## Recommended Implementation Order

1. ✅ **Analyze feasibility** (this document)
2. 🔄 **Phase 2.1: Remove click-to-sort from table columns**
   - Create SortOrderSection component
   - Add to sidebar
   - Remove sort indicators from table headers
   - Update user preferences to store sort settings
3. 🔄 **Phase 2.2: Implement collapsible sidebar sections**
   - Create CollapsibleSection component
   - Reorganize sidebar into sections
   - Add expand/collapse state persistence
   - Move search bar to Filters section
4. 🔄 **Phase 1: Backend API Enhancement**
   - Add new filter parameters
   - Keep backward compatibility with view parameter
   - Implement filter logic
5. 🔄 **Phase 2.3-2.4: Build filter UI components**
   - Season chip-based selector
   - Media type filter
   - Has MAL Status filter
   - Score range filter
6. 🔄 **Create view preset mappings**
7. 🔄 **Test all views work identically**
8. 🔄 **Phase 3: Add custom view saving**
9. 🔄 **Deprecate view parameter**

---

## Season Selector UI Design

### Overview
The season selector needs to support:
1. **Quick presets** (current, previous, next season)
2. **Multiple season selection** (e.g., "Fall 2025 + Summer 2025")
3. **Custom season picking** (any year/season combination)

### Proposed Design: Chip-Based Selector

```
┌─────────────────────────────────────────────────────┐
│ Season Filter                                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Quick Presets:                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Current  │ │ Previous │ │   Next   │           │
│  └──────────┘ └──────────┘ └──────────┘           │
│                                                     │
│  Selected Seasons:                                  │
│  ┌──────────────┐  ┌──────────────┐               │
│  │ Fall 2025  ✕ │  │ Winter 2026✕ │  [+ Add]      │
│  └──────────────┘  └──────────────┘               │
│                                                     │
│  [Clear All]                                        │
└─────────────────────────────────────────────────────┘
```

**How it works:**
- **Quick preset buttons**: Single click adds that season to selection
- **Chips**: Show selected seasons with remove button (✕)
- **[+ Add] button**: Opens a modal/dropdown to pick custom seasons
- **Multiple selection**: Accumulates seasons (union/OR logic)
- **Clear All**: Resets to no season filter

**Interactions:**
1. Click "Current" → Adds "Fall 2025" chip
2. Click "Previous" → Adds "Summer 2025" chip
3. Click "+ Add" → Opens season picker:
   ```
   ┌──────────────────────┐
   │ Add Season           │
   ├──────────────────────┤
   │ Year:  [2025 ▼]     │
   │                      │
   │ Season:              │
   │  ○ Winter            │
   │  ○ Spring            │
   │  ● Summer            │
   │  ○ Fall              │
   │                      │
   │ [Cancel]   [Add]     │
   └──────────────────────┘
   ```

**Benefits:**
1. **Visual clarity**: See all selected seasons at a glance
2. **Intuitive interaction**: Click to add, click ✕ to remove
3. **Flexible**: Works for 1 season or 10 seasons
4. **Space efficient**: Only shows selected items when collapsed
5. **Familiar pattern**: Used by many modern apps (Gmail filters, etc.)

---

### Implementation Details

```tsx
interface SeasonSelectorProps {
  selectedSeasons: Array<{ year: number; season: Season }>;
  onChange: (seasons: Array<{ year: number; season: Season }>) => void;
}

const SeasonSelector: React.FC<SeasonSelectorProps> = ({ selectedSeasons, onChange }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const seasonInfos = getSeasonInfos();

  const addQuickSeason = (type: 'current' | 'previous' | 'next') => {
    const season = seasonInfos[type];
    if (!selectedSeasons.some(s => s.year === season.year && s.season === season.season)) {
      onChange([...selectedSeasons, season]);
    }
  };

  const removeSeason = (index: number) => {
    onChange(selectedSeasons.filter((_, i) => i !== index));
  };

  return (
    <div className={styles.seasonSelector}>
      <label className={styles.label}>Season Filter</label>
      
      {/* Quick Presets */}
      <div className={styles.quickPresets}>
        <button onClick={() => addQuickSeason('current')}>Current</button>
        <button onClick={() => addQuickSeason('previous')}>Previous</button>
        <button onClick={() => addQuickSeason('next')}>Next</button>
      </div>

      {/* Selected Chips */}
      <div className={styles.selectedSeasons}>
        {selectedSeasons.map((s, i) => (
          <div key={i} className={styles.chip}>
            {formatSeason(s.year, s.season).label}
            <button onClick={() => removeSeason(i)}>✕</button>
          </div>
        ))}
        <button 
          className={styles.addButton} 
          onClick={() => setShowAddModal(true)}
        >
          + Add
        </button>
      </div>

      {/* Clear All */}
      {selectedSeasons.length > 0 && (
        <button onClick={() => onChange([])}>Clear All</button>
      )}

      {/* Add Season Modal */}
      {showAddModal && (
        <AddSeasonModal 
          onAdd={(season) => {
            onChange([...selectedSeasons, season]);
            setShowAddModal(false);
          }}
          onCancel={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
};
```

**CSS Styling:**
```css
.seasonSelector {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.quickPresets {
  display: flex;
  gap: 0.5rem;
}

.quickPresets button {
  padding: 0.5rem 1rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  cursor: pointer;
  transition: background 0.2s;
}

.quickPresets button:hover {
  background: var(--accent-primary);
}

.selectedSeasons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  min-height: 40px;
  padding: 0.5rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
}

.chip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--accent-primary);
  border-radius: 20px;
  color: white;
  font-size: 0.9rem;
}

.chip button {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 1.2rem;
  line-height: 1;
  padding: 0;
  width: 20px;
  height: 20px;
}

.addButton {
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: 2px dashed var(--border-color);
  border-radius: 20px;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.9rem;
}
```

---

## Potential Challenges

### 1. **Season Calculation**
- **Issue**: Season boundaries need consistent calculation
- **Solution**: Use `getSeasonInfos()` utility on client, pass explicit dates to server

### 2. **find_shows Limit**
- **Issue**: 200-item limit should apply AFTER filters and sort
- **Solution**: Apply limit as final step on server

### 3. **Performance with Multiple Filters**
- **Issue**: Many filters could slow down initial load
- **Solution**: 
  - Keep server-side filtering
  - Add indexes if needed (unlikely with current data size)
  - Consider caching common filter combinations

### 4. **UI Complexity**
- **Issue**: Many filters = complex UI, sidebar becoming cramped
- **Solution**:
  - ✅ Organize sidebar into collapsible accordion sections
  - ✅ Persist section expand/collapse state per user
  - ✅ Keep most-used sections expanded by default (Views, Filters, Sort)
  - ✅ Collapse advanced sections by default (Column Visibility, Stats)
  - ✅ Move search to Filters section (consolidate all filtering)

### 5. **Column Header Acronyms**
- **Issue**: Cryptic acronyms (S, R, AS, AR, etc.) require tooltips, hard to remember
- **Solution**:
  - ✅ Remove click-to-sort from column headers
  - ✅ Add dedicated "Sort & Order" section in sidebar
  - ✅ Use dropdown with clear, readable labels
  - ✅ Simple radio buttons for asc/desc
  - ✅ Column headers become static labels with full/short clear names

---

## Next Steps

1. **Review this document** with the team
2. **Decide on filter UI design** (sketch mockups)
3. **Define API contract** for new parameters
4. **Create implementation tickets**
5. **Start with Phase 1** (backend API)

---

## Appendix: Example API Calls

### Before (View-based)
```
GET /api/anime/animes?view=new_season_strict&status=watching,completed
```

### After (Filter-based)
```
GET /api/anime/animes?season=[{"year":2025,"season":"fall"}]&status=watching,completed&hidden=false
```

### After (find_shows view)
```
GET /api/anime/animes?mediaType=tv&hasUserMalStatus=false&hidden=false&sortBy=mean&sortDir=desc&limit=200
```

### Backward Compatible (both work)
```
GET /api/anime/animes?view=find_shows
GET /api/anime/animes?mediaType=tv&hasUserMalStatus=false&hidden=false&sortBy=mean&sortDir=desc&limit=200
```
