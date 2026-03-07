import { useCallback, useEffect, useState } from 'react';
import { AccountSummary, AnnualAccountValue, AssetPosition, Transaction } from '@/models/savings';

export interface SavingsAccountData {
  summary: AccountSummary;
  positions: AssetPosition[];
}

export function useSavingsAccountData(accountId?: string | string[]) {
  const [data, setData] = useState<SavingsAccountData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [annualValues, setAnnualValues] = useState<AnnualAccountValue[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSummaryAndTransactions = useCallback(async () => {
    if (!accountId || Array.isArray(accountId)) return;
    setLoading(true);
    try {
      const [sumRes, transRes] = await Promise.all([
        fetch(`/api/savings/summary/${accountId}`),
        fetch(`/api/savings/transactions/${accountId}`)
      ]);

      if (sumRes.ok && transRes.ok) {
        setData(await sumRes.json());
        setTransactions(await transRes.json());
      }
    } catch (error) {
      console.error('Failed to fetch savings account data:', error);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  const fetchAnnualValues = useCallback(async () => {
    if (!accountId || Array.isArray(accountId)) return;
    try {
      const res = await fetch(`/api/savings/annual/${accountId}`);
      if (res.ok) {
        const values = await res.json();
        setAnnualValues(values);
      }
    } catch (error) {
      console.error('Failed to fetch annual values:', error);
    }
  }, [accountId]);

  useEffect(() => {
    fetchSummaryAndTransactions();
    fetchAnnualValues();
  }, [fetchSummaryAndTransactions, fetchAnnualValues]);

  return {
    data,
    transactions,
    annualValues,
    setAnnualValues,
    loading,
    refreshData: fetchSummaryAndTransactions,
    refreshAnnualValues: fetchAnnualValues
  };
}
