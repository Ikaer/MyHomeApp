import { AnnualAccountValue, Transaction } from '@/models/savings';
import { AnnualOverviewRow } from '../types';

interface BuildAnnualOverviewRowsParams {
  transactions: Transaction[];
  annualValues: AnnualAccountValue[];
  annualXirr: { year: number; value: number }[];
  currentValue?: number;
}

export function buildAnnualOverviewRows({
  transactions,
  annualValues,
  annualXirr,
  currentValue
}: BuildAnnualOverviewRowsParams): AnnualOverviewRow[] {
  const years: number[] = [];
  const currentYear = new Date().getFullYear();

  if (transactions.length > 0) {
    const firstYear = Math.min(...transactions.map(t => new Date(`${t.date}T00:00:00`).getFullYear()));
    for (let year = firstYear; year <= currentYear; year += 1) {
      years.push(year);
    }
  } else {
    years.push(currentYear);
  }

  const valueMap = annualValues.reduce<Record<number, number>>((acc, entry) => {
    acc[entry.year] = entry.endValue;
    return acc;
  }, {});
  const xirrMap = annualXirr.reduce<Record<number, number>>((acc, entry) => {
    acc[entry.year] = entry.value;
    return acc;
  }, {});

  return years.map(year => ({
    year,
    endValue: valueMap[year] ?? (year === currentYear ? currentValue : undefined),
    xirr: xirrMap[year]
  }));
}
