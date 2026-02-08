import { useCallback, useEffect, useState } from 'react';
import { HistoricalAccountRecord } from '@/components/savings/account-details/types';

export function useAccountHistory(accountId?: string | string[]) {
  const [history, setHistory] = useState<HistoricalAccountRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!accountId || Array.isArray(accountId)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/savings/historical/accounts/${accountId}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      } else {
        setHistory([]);
      }
    } catch (error) {
      console.error('Failed to fetch account history:', error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    history,
    loading,
    refreshHistory: fetchHistory
  };
}
