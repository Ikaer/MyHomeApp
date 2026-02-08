import { AssetPosition, Transaction } from '@/models/savings';
import { PositionSortKey, SortDirection, TransactionSortKey } from '../types';

interface SortState<TKey extends string> {
  key: TKey;
  direction: SortDirection;
}

export function sortPositions(positions: AssetPosition[], sort: SortState<PositionSortKey>) {
  return [...positions].sort((a, b) => {
    let left: number | string = '';
    let right: number | string = '';

    switch (sort.key) {
      case 'asset':
        left = a.name;
        right = b.name;
        break;
      case 'quantity':
        left = a.quantity;
        right = b.quantity;
        break;
      case 'avgPrice':
        left = a.averagePurchasePrice;
        right = b.averagePurchasePrice;
        break;
      case 'currentPrice':
        left = a.currentPrice;
        right = b.currentPrice;
        break;
      case 'value':
        left = a.currentValue;
        right = b.currentValue;
        break;
      case 'gainLoss':
        left = a.unrealizedGainLoss;
        right = b.unrealizedGainLoss;
        break;
      case 'gainLossPct':
        left = a.unrealizedGainLossPercentage;
        right = b.unrealizedGainLossPercentage;
        break;
    }

    if (typeof left === 'string' || typeof right === 'string') {
      const result = String(left).localeCompare(String(right));
      return sort.direction === 'asc' ? result : -result;
    }

    const result = Number(left) - Number(right);
    return sort.direction === 'asc' ? result : -result;
  });
}

export function sortTransactions(transactions: Transaction[], sort: SortState<TransactionSortKey>) {
  return [...transactions].sort((a, b) => {
    let left: number | string = '';
    let right: number | string = '';

    switch (sort.key) {
      case 'date':
        left = a.date;
        right = b.date;
        break;
      case 'type':
        left = a.type;
        right = b.type;
        break;
      case 'asset':
        left = a.assetName;
        right = b.assetName;
        break;
      case 'ticker':
        left = a.ticker;
        right = b.ticker;
        break;
      case 'isin':
        left = a.isin;
        right = b.isin;
        break;
      case 'quantity':
        left = a.quantity;
        right = b.quantity;
        break;
      case 'price':
        left = a.unitPrice;
        right = b.unitPrice;
        break;
      case 'fees':
        left = a.fees;
        right = b.fees;
        break;
      case 'ttf':
        left = a.ttf;
        right = b.ttf;
        break;
      case 'total':
        left = a.totalAmount;
        right = b.totalAmount;
        break;
    }

    if (typeof left === 'string' || typeof right === 'string') {
      const result = String(left).localeCompare(String(right));
      return sort.direction === 'asc' ? result : -result;
    }

    const result = Number(left) - Number(right);
    return sort.direction === 'asc' ? result : -result;
  });
}
