import xirr from 'xirr';
import { Transaction, AnnualAccountValue } from '@/models/savings';

interface AnnualXirrPoint {
  year: number;
  value: number;
}

interface BuildAnnualXirrParams {
  transactions: Transaction[];
  annualValues: AnnualAccountValue[];
  currentValue?: number;
}

export function buildAnnualXirr({
  transactions,
  annualValues,
  currentValue
}: BuildAnnualXirrParams): AnnualXirrPoint[] {
  if (transactions.length === 0) return [];

  const parsedTransactions = [...transactions]
    .map(t => ({ ...t, dateObj: new Date(`${t.date}T00:00:00`) }))
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  const firstYear = parsedTransactions[0].dateObj.getFullYear();
  const currentYear = new Date().getFullYear();
  const annualValueMap = annualValues.reduce<Record<number, number>>((acc, entry) => {
    acc[entry.year] = entry.endValue;
    return acc;
  }, {});

  const results: AnnualXirrPoint[] = [];

  for (let year = firstYear; year <= currentYear; year += 1) {
    const fallbackCurrentValue = year === currentYear ? currentValue : undefined;
    const endValue = annualValueMap[year] ?? fallbackCurrentValue;
    if (endValue === undefined) continue;

    const startDate = new Date(year, 0, 1);
    const endDate = year === currentYear
      ? new Date(new Date().setHours(0, 0, 0, 0))
      : new Date(year, 11, 31);
    const startValue = year === firstYear ? 0 : annualValueMap[year - 1];
    if (startValue === undefined) continue;

    const cashflows = parsedTransactions
      .filter(t => t.dateObj >= startDate && t.dateObj <= endDate)
      .map(t => ({
        amount: t.type === 'Buy' ? -t.totalAmount : t.totalAmount,
        when: t.dateObj
      }));

    cashflows.unshift({ amount: -startValue, when: startDate });
    cashflows.push({ amount: endValue, when: endDate });

    try {
      const value = xirr(cashflows);
      if (Number.isFinite(value)) {
        results.push({ year, value });
      }
    } catch (error) {
      // Skip years where XIRR fails to converge or lacks cashflows
    }
  }

  return results;
}
