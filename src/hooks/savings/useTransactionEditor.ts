import { useState } from 'react';
import { Transaction } from '@/models/savings';

interface UseTransactionEditorParams {
  accountId: string;
  onRefresh: () => void;
}

export function useTransactionEditor({ accountId, onRefresh }: UseTransactionEditorParams) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'add' | 'edit'>('add');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const openAddTransaction = () => {
    setMode('add');
    setEditingTransaction(null);
    setIsOpen(true);
  };

  const openEditTransaction = (transaction: Transaction) => {
    setMode('edit');
    setEditingTransaction(transaction);
    setIsOpen(true);
  };

  const closeTransactionEditor = () => {
    setIsOpen(false);
    setEditingTransaction(null);
    setMode('add');
  };

  const saveTransaction = async (transaction: Transaction) => {
    try {
      const method = mode === 'edit' ? 'PUT' : 'POST';
      const res = await fetch(`/api/savings/transactions/${accountId}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction)
      });

      if (res.ok) {
        closeTransactionEditor();
        onRefresh();
      } else {
        const err = await res.json();
        alert(`Failed to save transaction: ${err.error}`);
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('An error occurred while saving the transaction.');
    }
  };

  return {
    isOpen,
    mode,
    editingTransaction,
    openAddTransaction,
    openEditTransaction,
    closeTransactionEditor,
    saveTransaction
  };
}
