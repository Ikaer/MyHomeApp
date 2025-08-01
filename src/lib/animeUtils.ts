/**
 * Client-safe anime utility functions
 * These functions can be used in both client and server components
 */

// Utility function to format season display with nice labels and colors
export function formatSeason(year: number, season: string): { label: string; color: string } {
  const seasonMap: Record<string, { label: string; color: string }> = {
    'spring': { label: 'Spring', color: '#10B981' }, // Green
    'summer': { label: 'Summer', color: '#F59E0B' }, // Orange
    'fall': { label: 'Fall', color: '#EF4444' },     // Red
    'winter': { label: 'Winter', color: '#3B82F6' }  // Blue
  };
  
  const seasonInfo = seasonMap[season] || { label: season, color: '#6B7280' };
  return {
    label: `${seasonInfo.label} ${year}`,
    color: seasonInfo.color
  };
}

// You can add other client-safe anime utility functions here
