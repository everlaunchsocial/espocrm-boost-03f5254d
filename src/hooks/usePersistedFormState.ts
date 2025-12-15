import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

const STORAGE_PREFIX = 'form_draft_';

export function usePersistedFormState(
  key: string,
  defaultValues: Record<string, any>,
  isOpen: boolean
): {
  values: Record<string, any>;
  setValues: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  updateField: (name: string, value: any) => void;
  clearDraft: () => void;
  hasDraft: boolean;
} {
  const storageKey = `${STORAGE_PREFIX}${key}`;
  
  const [values, setValues] = useState<Record<string, any>>(defaultValues);
  const [hasDraft, setHasDraft] = useState(false);

  // Load draft when form opens
  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Only restore if there's actual data (not just defaults)
          const hasContent = Object.values(parsed).some(v => v && v !== '');
          if (hasContent) {
            setValues(parsed);
            setHasDraft(true);
            toast.info('Draft restored', { duration: 2000 });
          }
        }
      } catch (e) {
        console.error('Failed to load form draft:', e);
      }
    }
  }, [isOpen, storageKey]);

  // Save to localStorage whenever values change
  useEffect(() => {
    if (isOpen) {
      const hasContent = Object.values(values).some(v => v && v !== '');
      if (hasContent) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(values));
        } catch (e) {
          console.error('Failed to save form draft:', e);
        }
      }
    }
  }, [values, isOpen, storageKey]);

  const updateField = useCallback((name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setHasDraft(false);
    } catch (e) {
      console.error('Failed to clear form draft:', e);
    }
  }, [storageKey]);

  return { values, setValues, updateField, clearDraft, hasDraft };
}
