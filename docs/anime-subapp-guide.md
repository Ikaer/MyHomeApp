# Anime Subapp Guide

## Purpose
This subapp will help me track the list of anime of this season (plus the previous season still airing).

## Acronyms
- MAL: MyAnimeList

## General functionalities
- MyAnimeList API integration for anime data
- MyAnimeList user authentication to retrieve my watching status, ratings, etc.
- Display anime list with details (title, image, synopsis, etc.) and possible filters, sort and interactions.

## General notes
- The subapp will follow the established architecture patterns of the project (cf [docs/archive/Summary_2025-07-14.md](docs/archive/Summary_2025-07-14.md)).
- a previous app was developed using python and flask which have all the base functionalities we want, it can be used as a reference to know how to contact the MyAnimeList API and what data to retrieve and more. (cf [python-anime-app](pyhton-anime-app)).

## Data separation
- While MAL is providing the "base anime data" that we will keep in the database, the data will be extended with user-specific data (for example the provider where to watch the anime and the url to the anime page on the provider's website). The two set of data must keep separated in the database but reassambled in the frontend to display the anime list.

## Steps to implement the anime subapp
### 1. Authentication
- Implement MyAnimeList user authentication: in the subapp, add a button with multiple state "Connect to MyAnimeList", "Disconnect from MyAnimeList", "Connected to MyAnimeList" (with the user name displayed).

### 2. Anime data retrieval
- When connected to my MAL, propose a button "sync" to fetch anime from current season (and previous season still airing) and store the data in the database, also store the sync date.
- This is an upsert operation, so if the anime already exists in the database, you dont need to compare fields to fields, just insert new data and replace the existing one (base on the MAL id).
- Store data in "animes_MAL.json" file.
- When retrieving data from MAL, don't filter for "currently_airing" at this stage - just take the current season and the previous season and store them all.
- Filter the data when displaying it: (all current season - whatever status) + (previous season / status = currently_airing)
please check the [python-anime-app](pyhton-anime-app) for the API calls to retrieve the data and for specific (like getting the alternate title in english)

### 3. Anime extension data
- Create a new model to store the user-specific data for each anime (e.g., provider, url, etc.).
- Store this data in "animes_extensions.json" file.
- Implement a form to add/edit this data for each anime in the list.
- Ensure that this data is linked to the anime's MAL ID for easy retrieval and updates, but not stored in the same table as the base anime data.

### 4. Anime list display
- Create a page to display the anime list with the following features:
  - Use a **table format** (not cards) to display the anime list.
  - Display anime title, image, synopsis, score, and other relevant details in table columns.
  - Add a link to MAL (format: `https://myanimelist.net/anime/{mal_id}`).
  - Implement **column sorting** by clicking column headers (default sort: by score/mean descending).
  - **No pagination** - display the full filtered list of current season + previous season still airing.
  - Filter logic: Show all anime from current season (any status) + anime from previous season that are still airing.

## Technical implementation details
### Data storage
- **animes_MAL.json**: Contains base anime data from MyAnimeList API
- **animes_extensions.json**: Contains user-specific data (providers, URLs, notes) linked by MAL ID
- **mal_auth.json**: OAuth token storage

### API Endpoints
- `GET/POST /api/anime/auth` - MAL authentication flow
- `POST /api/anime/sync` - Fetch and store seasonal anime data
- `GET /api/anime/animes` - Returns the combined list of animes with extensions for table display
- `GET /api/anime/animes/{id}` - Get detailed information for a specific anime
- `GET/POST /api/anime/animes/{id}/extensions` - Get/update user extension data for a specific anime (using MAL ID)

### Extension Data Structure
```json
// animes_extensions.json structure
{
  "12345": {
    "providers": [
      { "name": "Crunchyroll", "url": "https://..." },
      { "name": "Netflix", "url": "https://..." }
    ],
    "notes": "Great animation"
  },
  "67890": {
    "providers": [
      { "name": "Disney+", "url": "https://..." }
    ],
    "notes": "Interesting story premise"
  }
}
```
  