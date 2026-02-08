import { useCallback, useEffect, useState } from 'react';
import { HistoricalAssetRecord } from '@/components/savings/account-details/types';

export function useAssetHistory(isins: string[]) {
  const [assetHistory, setAssetHistory] = useState<Record<string, HistoricalAssetRecord[]>>({});

  const fetchAssetHistory = useCallback(async () => {
    const uniqueIsins = Array.from(new Set(isins.filter(Boolean)));
    if (uniqueIsins.length === 0) return;

    try {
      const results = await Promise.all(uniqueIsins.map(async (isin) => {
        const res = await fetch(`/api/savings/historical/assets/${encodeURIComponent(isin)}`);
        if (!res.ok) return [isin, []] as const;
        const data = await res.json();
        return [isin, data] as const;
      }));

      const nextHistory: Record<string, HistoricalAssetRecord[]> = {};
      results.forEach(([isin, entries]) => {
        nextHistory[isin] = entries as HistoricalAssetRecord[];
      });
      setAssetHistory(nextHistory);
    } catch (error) {
      console.error('Failed to fetch asset history:', error);
      setAssetHistory({});
    }
  }, [isins]);

  useEffect(() => {
    fetchAssetHistory();
  }, [fetchAssetHistory]);

  return {
    assetHistory,
    refreshAssetHistory: fetchAssetHistory
  };
}
