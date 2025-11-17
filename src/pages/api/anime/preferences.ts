import { NextApiRequest, NextApiResponse } from 'next';
import { getAnimeUserPreferences, saveAnimeUserPreferences } from '@/lib/anime';
import { AnimeUserPreferences } from '@/models/anime';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      // Get current user preferences
      const preferences = getAnimeUserPreferences();
      return res.status(200).json(preferences);
    }

    if (req.method === 'PUT') {
      // Update user preferences
      const updates: Partial<AnimeUserPreferences> = req.body;

      // Validate the updates (basic validation)
      if (updates.currentView !== undefined && typeof updates.currentView !== 'string') {
        return res.status(400).json({ error: 'Invalid currentView' });
      }

      if (updates.statusFilters !== undefined && !Array.isArray(updates.statusFilters)) {
        return res.status(400).json({ error: 'Invalid statusFilters' });
      }

      if (updates.evolutionPeriod !== undefined && typeof updates.evolutionPeriod !== 'string') {
        return res.status(400).json({ error: 'Invalid evolutionPeriod' });
      }

      if (updates.sortBy !== undefined && typeof updates.sortBy !== 'string') {
        return res.status(400).json({ error: 'Invalid sortBy' });
      }

      if (updates.sortDir !== undefined && (updates.sortDir !== 'asc' && updates.sortDir !== 'desc')) {
        return res.status(400).json({ error: 'Invalid sortDir' });
      }

      if (updates.searchQuery !== undefined && typeof updates.searchQuery !== 'string') {
        return res.status(400).json({ error: 'Invalid searchQuery' });
      }

      if (updates.seasons !== undefined && !Array.isArray(updates.seasons)) {
        return res.status(400).json({ error: 'Invalid seasons' });
      }

      if (updates.mediaTypes !== undefined && !Array.isArray(updates.mediaTypes)) {
        return res.status(400).json({ error: 'Invalid mediaTypes' });
      }

      if (updates.hiddenOnly !== undefined && typeof updates.hiddenOnly !== 'boolean') {
        return res.status(400).json({ error: 'Invalid hiddenOnly' });
      }

      if (updates.minScore !== undefined && updates.minScore !== null && typeof updates.minScore !== 'number') {
        return res.status(400).json({ error: 'Invalid minScore' });
      }

      if (updates.maxScore !== undefined && updates.maxScore !== null && typeof updates.maxScore !== 'number') {
        return res.status(400).json({ error: 'Invalid maxScore' });
      }

      if (updates.sidebarExpanded !== undefined && (typeof updates.sidebarExpanded !== 'object' || updates.sidebarExpanded === null)) {
        return res.status(400).json({ error: 'Invalid sidebarExpanded' });
      }

      // Save the preferences
      saveAnimeUserPreferences(updates);

      // Return the updated preferences
      const updatedPreferences = getAnimeUserPreferences();
      return res.status(200).json(updatedPreferences);
    }

    // Method not allowed
    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });

  } catch (error) {
    console.error('Preferences API error:', error);
    return res.status(500).json({ 
      error: 'Failed to handle preferences request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
