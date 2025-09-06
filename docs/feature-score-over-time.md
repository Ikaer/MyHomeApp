# Development of Feature Score Over Time

## Objective
Develope a feature that tracks the score of animes over time, allowing users to visualize how their ratings have changed.

## Main parts
### Daily Task
The app currently can sync with MyAnimeList to fetch scores, info, etc and store them in a local db. However this operation is manual and done by the user. The first step is to automate this operation by creating a daily task that will run every day at a specific time (e.g., 2:00 AM) to fetch the latest scores from MyAnimeList and store them in the local database.


### Data Storage
The score actually stored is only one value per anime, which is the latest score. To track the score over time, we need to store multiple scores for each anime along with the date when the score was fetched. To keep the simplicity of the current file-base database, we will implements a new JSON file that will store a double-keyed dictionary. The first key will be the anime ID, and the second key will be the date (in YYYY-MM-DD format). The value will be a subset of the anime data, including at least the score:
```json
{
  "mean": 8.73,
    "rank": 52,
    "popularity": 17,
    "num_list_users": 2560930,
    "num_scoring_users": 1456719,
	"my_list_status": {
      "status": "dropped",
      "score": 9,
      "num_episodes_watched": 0,
      "is_rewatching": false,
      "updated_at": "2025-04-25T18:07:41+00:00"
    }
}
```

### Visualization
For the moment, we will just show the evolution of the metrics with a percentage change over the last X weeks, with a dropdown to select the number of weeks (1, 2, 4, 8, 12, 24, 52). The percentage change will be calculated as follows:
```percentage_change = ((latest_value - past_value) / past_value) * 100
```
Where `latest_value` is the most recent value fetched, and `past_value` is the value from X weeks ago.
Metrics to show:
- Score
- number of scoring users
- number of list users
- popularity
- rank

Those metrics will be displayed in a unique cell on multiple lines with a visual indicator (arrow up/down + color green/red) to indicate if the metric has increased or decreased.

## Implementation

### Revised Plan

#### Phase 1: Backend and Data Structure

1.  **Data Models:**
    *   I will define a new interface `AnimeScoreHistory` in `src/models/anime/index.ts`. This interface will strictly follow the structure you provided, containing `mean`, `rank`, `popularity`, `num_list_users`, `num_scoring_users`, and `my_list_status`.
    *   I will also define the `AnimeScoresHistoryData` type, which will be a dictionary mapping anime IDs to their historical scores (`Record<number, Record<string, AnimeScoreHistory>>`).

2.  **Data Handling:**
    *   In `src/lib/anime.ts`, I will create new functions to manage the `anime-scores-history.json` file. These will include `getAnimeScoresHistory` to read the data and `updateAnimeScoresHistory` to write new entries.

3.  **Sync Logic Enhancement:**
    *   I will modify the `performBigSyncAsync` function in `src/pages/api/anime/big-sync.ts`. After fetching the anime data, I will add logic to extract the relevant score-related fields and save them to `anime-scores-history.json` using the new data handling functions.

4.  **Automated Daily Sync (Server-Side):**
    *   I will create a new API route, `src/pages/api/anime/cron-sync.ts`. This route will be a simple endpoint that, when called, will trigger the existing `big-sync` logic.
    *   To schedule the daily execution, I will update the `docker-compose.yml` and `Dockerfile` to include a `cron` service. This service will run a lightweight Alpine Linux container with `crond` and `curl`. I will add a cron job that sends a `POST` request to the `/api/anime/cron-sync` endpoint every day at 2:00 AM. This approach is robust for a Docker-based deployment and ensures the task runs on the server, independently of any client-side activity.

#### Phase 2: Frontend Visualization

This phase remains the same as in the previous plan. I will create a `ScoreEvolution` component to display the percentage change in metrics and integrate it into the `AnimeTable`.