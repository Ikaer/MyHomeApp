import { NextApiRequest, NextApiResponse } from 'next';
import { getMALAuthData, isMALTokenValid, upsertMALAnime, getSyncMetadata, updateAnimeScoresHistory } from '@/lib/anime';
import { AnimeSeasonResponse, MALAnime } from '@/models/anime';

// Store ongoing big sync processes
const syncProcesses = new Map<string, { 
  isRunning: boolean; 
  progress: any[]; 
  latestProgressIndex: number;
}>();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    return handleStartBigSync(req, res);
  } else if (req.method === 'GET') {
    return handleEventStream(req, res);
  } else {
    res.setHeader('Allow', ['POST', 'GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

async function handleStartBigSync(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check authentication
    const { token } = getMALAuthData();
    if (!token || !isMALTokenValid(token)) {
      return res.status(401).json({ error: 'Not authenticated with MAL' });
    }

    // Generate a unique sync ID
    const syncId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize sync process
    syncProcesses.set(syncId, { isRunning: true, progress: [], latestProgressIndex: -1 });

    // Start the sync process asynchronously
    performBigSyncAsync(token.access_token, syncId);

    return res.status(200).json({ 
      message: 'Big sync started',
      syncId
    });

  } catch (error) {
    console.error('Error starting big sync:', error);
    res.status(500).json({ 
      error: 'Failed to start big sync',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleEventStream(req: NextApiRequest, res: NextApiResponse) {
  const { syncId } = req.query;
  
  if (!syncId || typeof syncId !== 'string') {
    return res.status(400).json({ error: 'syncId is required' });
  }

  // Set up Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  const syncProcess = syncProcesses.get(syncId);
  if (!syncProcess) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Sync process not found' })}\n\n`);
    res.end();
    return;
  }

  let lastSentIndex = -1;

  // Send existing progress
  for (let i = 0; i < syncProcess.progress.length; i++) {
    res.write(`data: ${JSON.stringify(syncProcess.progress[i])}\n\n`);
    lastSentIndex = i;
  }

  // Set up interval to check for new progress
  const intervalId = setInterval(() => {
    const currentProcess = syncProcesses.get(syncId);
    if (!currentProcess) {
      clearInterval(intervalId);
      res.end();
      return;
    }

    // Send any new progress updates
    for (let i = lastSentIndex + 1; i < currentProcess.progress.length; i++) {
      res.write(`data: ${JSON.stringify(currentProcess.progress[i])}\n\n`);
      lastSentIndex = i;
      
      // Check if this is the final update
      const progress = currentProcess.progress[i];
      if (progress.type === 'complete' || progress.type === 'error') {
        clearInterval(intervalId);
        // Clean up after a delay
        setTimeout(() => syncProcesses.delete(syncId), 30000);
        res.end();
        return;
      }
    }

    if (!currentProcess.isRunning && lastSentIndex >= currentProcess.progress.length - 1) {
      clearInterval(intervalId);
      res.end();
    }
  }, 1000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(intervalId);
  });
}

async function performBigSyncAsync(accessToken: string, syncId: string) {
  const addProgress = (progress: any) => {
    const syncProcess = syncProcesses.get(syncId);
    if (syncProcess) {
      syncProcess.progress.push(progress);
      // Keep only the last 100 progress updates to prevent memory leaks
      if (syncProcess.progress.length > 100) {
        syncProcess.progress = syncProcess.progress.slice(-50);
      }
    }
  };

  try {
    // Calculate seasons for the last 10 years
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const seasons = ['winter', 'spring', 'summer', 'fall'];
    
    const seasonsToSync: Array<{ year: number; season: string }> = [];
    
    // Generate list of seasons from 8 years ago to 2 years in the future
    for (let year = currentYear + 2; year >= currentYear - 8; year--) {
      for (const season of seasons) {
        seasonsToSync.push({ year, season });
      }
    }

    console.log(`Big sync ${syncId}: Processing ${seasonsToSync.length} seasons from ${currentYear - 8} to ${currentYear + 2}`);
    
    addProgress({
      type: 'start',
      message: `Starting big sync for ${seasonsToSync.length} seasons and upcoming ranking`,
      totalSeasons: seasonsToSync.length,
      currentSeason: 0
    });

    const allAnime: MALAnime[] = [];
    let processedSeasons = 0;

    // 1. Fetch top 500 upcoming anime
    try {
      addProgress({
        type: 'progress',
        message: 'Fetching top 500 upcoming anime...',
        totalSeasons: seasonsToSync.length,
        currentSeason: 0,
      });
      const upcomingAnime = await fetchUpcomingAnime(accessToken, addProgress);
      allAnime.push(...upcomingAnime);
      addProgress({
        type: 'season_complete',
        message: `Completed fetching upcoming anime - ${upcomingAnime.length} anime`,
        totalSeasons: seasonsToSync.length,
        currentSeason: 0,
        seasonAnimeCount: upcomingAnime.length,
        totalAnimeCount: allAnime.length,
        year: 'N/A',
        season: 'upcoming'
      });
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('Error fetching upcoming anime:', error);
      addProgress({
        type: 'season_error',
        message: `Failed to fetch upcoming anime: ${error instanceof Error ? error.message : 'Unknown error'}`,
        year: 'N/A',
        season: 'upcoming'
      });
    }

    // 2. Process each season with rate limiting
    for (const { year, season } of seasonsToSync) {
      try {
        addProgress({
          type: 'progress',
          message: `Syncing ${year} ${season}...`,
          totalSeasons: seasonsToSync.length,
          currentSeason: processedSeasons + 1,
          year,
          season
        });

        const seasonAnime = await fetchSeasonalAnime(accessToken, year, season, addProgress);
        allAnime.push(...seasonAnime);
        processedSeasons++;

        addProgress({
          type: 'season_complete',
          message: `Completed ${year} ${season} - ${seasonAnime.length} anime`,
          totalSeasons: seasonsToSync.length,
          currentSeason: processedSeasons,
          seasonAnimeCount: seasonAnime.length,
          totalAnimeCount: allAnime.length,
          year,
          season
        });

        // Rate limiting: 2 second delay between seasons
        if (processedSeasons < seasonsToSync.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        console.error(`Error syncing ${year} ${season}:`, error);
        addProgress({
          type: 'season_error',
          message: `Failed to sync ${year} ${season}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          year,
          season
        });
        // Continue with next season instead of failing completely
      }
    }

    // Upsert all anime data
    if (allAnime.length > 0) {
      upsertMALAnime(allAnime);
      updateAnimeScoresHistory(allAnime);
    }

    console.log(`Big sync ${syncId} completed: ${allAnime.length} anime from ${processedSeasons} seasons`);

    // Send final result
    const syncMetadata = getSyncMetadata();
    addProgress({
      type: 'complete',
      message: `Big sync completed successfully!`,
      syncedCount: allAnime.length,
      processedSeasons,
      totalSeasons: seasonsToSync.length,
      metadata: syncMetadata
    });

  } catch (error) {
    console.error(`Big sync ${syncId} error:`, error);
    
    addProgress({
      type: 'error',
      error: 'Failed to perform big sync',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    const syncProcess = syncProcesses.get(syncId);
    if (syncProcess) {
      syncProcess.isRunning = false;
    }
  }
}

async function fetchUpcomingAnime(
  accessToken: string,
  addProgress?: (progress: any) => void
): Promise<MALAnime[]> {
  const allAnime: MALAnime[] = [];
  const limit = 500; // As requested

  const fields = [
    'id', 'title', 'main_picture', 'alternative_titles',
    'start_date', 'end_date', 'synopsis', 'mean', 'rank', 'popularity',
    'num_list_users', 'num_scoring_users', 'nsfw', 'genres',
    'created_at', 'updated_at', 'media_type', 'status',
    'my_list_status', 'num_episodes', 'start_season', 'broadcast',
    'source', 'average_episode_duration', 'rating', 'pictures',
    'background', 'related_anime', 'studios'
  ].join(',');

  const url = `https://api.myanimelist.net/v2/anime/ranking`;
  const params = new URLSearchParams({
    ranking_type: 'upcoming',
    limit: limit.toString(),
    fields,
    nsfw: 'true'
  });

  console.log(`Fetching top ${limit} upcoming anime`);

  const response = await fetch(`${url}?${params}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`MAL API request failed for upcoming ranking: ${response.status} ${response.statusText}`);
  }

  const data: AnimeSeasonResponse = await response.json();
  
  if (data.data && data.data.length > 0) {
    const upcomingAnime = data.data.map(item => item.node);
    allAnime.push(...upcomingAnime);
    console.log(`Fetched ${upcomingAnime.length} upcoming anime`);

    if (addProgress) {
      addProgress({
        type: 'fetch_progress',
        message: `Fetched ${allAnime.length} upcoming anime`,
        year: 'N/A',
        season: 'upcoming',
        fetched: allAnime.length
      });
    }
  }

  console.log(`Finished fetching upcoming anime: ${allAnime.length} anime`);
  return allAnime;
}

async function fetchSeasonalAnime(
  accessToken: string, 
  year: number, 
  season: string,
  addProgress?: (progress: any) => void
): Promise<MALAnime[]> {
  const allAnime: MALAnime[] = [];
  let offset = 0;
  const limit = 100; // MAL API limit

  // Fields to include in the response (based on Python app)
  const fields = [
    'id', 'title', 'main_picture', 'alternative_titles',
    'start_date', 'end_date', 'synopsis', 'mean', 'rank', 'popularity',
    'num_list_users', 'num_scoring_users', 'nsfw', 'genres',
    'created_at', 'updated_at', 'media_type', 'status',
    'my_list_status', 'num_episodes', 'start_season', 'broadcast',
    'source', 'average_episode_duration', 'rating', 'pictures',
    'background', 'related_anime', 'studios'
  ].join(',');

  while (true) {
    const url = `https://api.myanimelist.net/v2/anime/season/${year}/${season}`;
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      fields,
      nsfw: 'true' // Include NSFW content
    });

    console.log(`Fetching ${year} ${season} anime, offset: ${offset}`);

    const response = await fetch(`${url}?${params}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`MAL API request failed: ${response.status} ${response.statusText}`);
    }

    const data: AnimeSeasonResponse = await response.json();
    
    if (!data.data || data.data.length === 0) {
      break; // No more data
    }

    // Extract anime from response
    const seasonAnime = data.data.map(item => item.node);
    allAnime.push(...seasonAnime);

    console.log(`Fetched ${seasonAnime.length} anime (total: ${allAnime.length})`);

    // Send progress update if callback provided
    if (addProgress) {
      addProgress({
        type: 'fetch_progress',
        message: `Fetching ${year} ${season} - ${allAnime.length} anime so far`,
        year,
        season,
        offset,
        fetched: allAnime.length
      });
    }

    // Check if there's more data
    if (!data.paging?.next || data.data.length < limit) {
      break;
    }

    offset += limit;

    // Add a small delay between requests to be respectful to the API
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`Finished fetching ${year} ${season}: ${allAnime.length} anime`);
  return allAnime;
}
