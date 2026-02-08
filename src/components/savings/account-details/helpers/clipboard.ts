import { SavingsAccount, Transaction } from '@/models/savings';
import { AnnualOverviewRow } from '../types';
import { SavingsAccountData } from '@/hooks/savings/useSavingsAccountData';

interface BuildClipboardTextParams {
  account: SavingsAccount;
  data: SavingsAccountData;
  annualOverviewRows: AnnualOverviewRow[];
  transactions: Transaction[];
  formatCurrency: (val: number) => string;
  formatPercent: (val: number) => string;
}

export function buildClipboardText({
  account,
  data,
  annualOverviewRows,
  transactions,
  formatCurrency,
  formatPercent
}: BuildClipboardTextParams) {
  const lines: string[] = [];
  lines.push(`Savings Account: ${account.name} (${account.type})`);
  lines.push(`Currency: ${account.currency}`);
  lines.push('');
  lines.push('Summary');
  lines.push(`- Current Value: ${formatCurrency(data.summary.currentValue)}`);
  lines.push(`- Total Invested: ${formatCurrency(data.summary.totalInvested)}`);
  lines.push(`- Total Gain/Loss: ${data.summary.totalGainLoss >= 0 ? '+' : ''}${formatCurrency(data.summary.totalGainLoss)}`);
  lines.push(`- XIRR (Annualized): ${data.summary.xirr >= 0 ? '+' : ''}${formatPercent(data.summary.xirr * 100)}`);
  lines.push('');
  lines.push('Annual Overview');
  if (annualOverviewRows.length === 0) {
    lines.push('- No annual data');
  } else {
    annualOverviewRows.forEach(entry => {
      const endValue = entry.endValue === undefined ? '—' : formatCurrency(entry.endValue);
      const xirrValue = entry.xirr === undefined ? '—' : `${entry.xirr >= 0 ? '+' : ''}${formatPercent(entry.xirr * 100)}`;
      lines.push(`- ${entry.year}: End Value ${endValue}, XIRR ${xirrValue}`);
    });
  }
  lines.push('');
  lines.push('Positions');
  data.positions.forEach(pos => {
    lines.push(`- ${pos.name} (${pos.ticker}): Qty ${pos.quantity.toFixed(2)}, PRU ${formatCurrency(pos.averagePurchasePrice)}, Curr. Price ${formatCurrency(pos.currentPrice)}, Value ${formatCurrency(pos.currentValue)}, G/L ${pos.unrealizedGainLoss >= 0 ? '+' : ''}${formatCurrency(pos.unrealizedGainLoss)} (${pos.unrealizedGainLossPercentage >= 0 ? '+' : ''}${formatPercent(pos.unrealizedGainLossPercentage)})`);
  });
  lines.push('');
  lines.push('Transactions (latest first)');
  const sortedTransactions = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
  sortedTransactions.forEach(t => {
    lines.push(`- ${t.date} ${t.type}: ${t.assetName} (${t.ticker}) Qty ${t.quantity} @ ${formatCurrency(t.unitPrice)} | Fees ${formatCurrency(t.fees)} | TTF ${formatCurrency(t.ttf)} | Total ${formatCurrency(t.totalAmount)}`);
  });

  return lines.join('\n');
}
