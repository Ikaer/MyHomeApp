import { useState } from 'react';
import { AnnualAccountValue } from '@/models/savings';

interface UseAnnualValueEditorParams {
  accountId: string;
  setAnnualValues: (values: AnnualAccountValue[]) => void;
}

export function useAnnualValueEditor({
  accountId,
  setAnnualValues
}: UseAnnualValueEditorParams) {
  const [editingYear, setEditingYear] = useState<number | null>(null);
  const [editingEndValue, setEditingEndValue] = useState<string>('');

  const openAnnualEditor = (year: number, endValue?: number) => {
    setEditingYear(year);
    setEditingEndValue(endValue !== undefined ? endValue.toString() : '');
  };

  const closeAnnualEditor = () => {
    setEditingYear(null);
    setEditingEndValue('');
  };

  const saveAnnualValue = async () => {
    if (editingYear === null) return;
    const parsedValue = parseFloat(editingEndValue);
    if (Number.isNaN(parsedValue)) {
      alert('Please enter a valid end-of-year value.');
      return;
    }

    try {
      const res = await fetch(`/api/savings/annual/${accountId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: editingYear,
          endValue: parsedValue
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setAnnualValues(updated);
        closeAnnualEditor();
      } else {
        const err = await res.json();
        alert(`Failed to save annual value: ${err.error}`);
      }
    } catch (error) {
      console.error('Failed to save annual value:', error);
      alert('An error occurred while saving the annual value.');
    }
  };

  return {
    editingYear,
    editingEndValue,
    setEditingEndValue,
    openAnnualEditor,
    closeAnnualEditor,
    saveAnnualValue
  };
}
