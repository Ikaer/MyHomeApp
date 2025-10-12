import { NextApiRequest, NextApiResponse } from 'next';
import { filterAnimeByView, getAnimeUserPreferences } from '@/lib/anime';
import { AnimeWithExtensions, SortColumn, SortDirection, AnimeView, animeViewsHelper } from '@/models/anime';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    // Get query parameters
    const { 
      search, 
      genres, 
      status, 
      minScore, 
      sortBy = 'mean', 
      sortDir = 'desc',
      view
    } = req.query;

    // Get user preferences for default view
    const userPrefs = getAnimeUserPreferences();
    
    let animeView: AnimeView = userPrefs.currentView;
    if(typeof view === 'string' && animeViewsHelper.isValid(view)) {
      animeView = view;
    }

    // Get filtered anime list based on view
    let animeList = filterAnimeByView(animeView);


    if(animeView == 'find_shows') {
      animeList = animeList.slice(0, 200); 
    }

    // Apply search filter
    if (search && typeof search === 'string') {
      const searchTerm = search.toLowerCase();
      animeList = animeList.filter(anime => 
        anime.title.toLowerCase().includes(searchTerm) ||
        (anime.alternative_titles?.en && anime.alternative_titles.en.toLowerCase().includes(searchTerm)) ||
        (anime.synopsis && anime.synopsis.toLowerCase().includes(searchTerm)) ||
        anime.genres.some(genre => genre.name.toLowerCase().includes(searchTerm))
      );
    }

    // Apply genre filter
    if (genres && typeof genres === 'string') {
      const genreList = genres.split(',').map(g => g.trim().toLowerCase());
      animeList = animeList.filter(anime =>
        anime.genres.some(genre => genreList.includes(genre.name.toLowerCase()))
      );
    }

    // Apply status filter
    if (status && typeof status === 'string') {
      const statusList = status.split(',').map(s => s.trim());
      animeList = animeList.filter(anime => {
        const userStatus = anime.my_list_status?.status;
        if (!userStatus) {
          return statusList.includes('not_defined');
        }
        return statusList.includes(userStatus);
      });
    }

    // Apply minimum score filter
    if (minScore && typeof minScore === 'string') {
      const minScoreNum = parseFloat(minScore);
      if (!isNaN(minScoreNum)) {
        animeList = animeList.filter(anime =>
          anime.mean && anime.mean >= minScoreNum
        );
      }
    }

    // Apply sorting
    const sortColumn = sortBy as SortColumn;
    const sortDirection = sortDir as SortDirection;
    
    animeList.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'mean':
          aValue = a.mean || 0;
          bValue = b.mean || 0;
          break;
        case 'start_date':
          aValue = a.start_date ? new Date(a.start_date).getTime() : 0;
          bValue = b.start_date ? new Date(b.start_date).getTime() : 0;
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'num_episodes':
          aValue = a.num_episodes || 0;
          bValue = b.num_episodes || 0;
          break;
        default:
          aValue = a.mean || 0;
          bValue = b.mean || 0;
      }

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });

    // Return the filtered and sorted list
    res.json({
      animes: animeList,
      total: animeList.length,
      view: animeView,
      filters: {
        search: search || null,
        genres: genres || null,
        status: status || null,
        minScore: minScore || null
      },
      sort: {
        column: sortColumn,
        direction: sortDirection
      }
    });

  } catch (error) {
    console.error('Get anime list error:', error);
    res.status(500).json({ 
      error: 'Failed to get anime list',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
