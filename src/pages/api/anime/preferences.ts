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
      if (updates.currentView && typeof updates.currentView !== 'string') {
        return res.status(400).json({ error: 'Invalid currentView' });
      }

      if (updates.statusFilters && !Array.isArray(updates.statusFilters)) {
        return res.status(400).json({ error: 'Invalid statusFilters' });
      }

      if (updates.evolutionPeriod && typeof updates.evolutionPeriod !== 'string') {
        return res.status(400).json({ error: 'Invalid evolutionPeriod' });
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
