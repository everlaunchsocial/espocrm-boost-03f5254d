import { useState, useEffect, useCallback, useRef } from 'react';
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
  const valuesRef = useRef(values);
  const isOpenRef = useRef(isOpen);
  
  // Keep refs in sync with state
  useEffect(() => {
    valuesRef.current = values;
  }, [values]);
  
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Save to localStorage function
  const saveToStorage = useCallback(() => {
    const currentValues = valuesRef.current;
    const hasContent = Object.values(currentValues).some(v => v && v !== '');
    if (hasContent) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(currentValues));
      } catch (e) {
        console.error('Failed to save form draft:', e);
      }
    }
  }, [storageKey]);

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

  // Save to localStorage whenever values change (aggressive save)
  useEffect(() => {
    if (isOpen) {
      saveToStorage();
    }
  }, [values, isOpen, saveToStorage]);

  // Handle visibility change - save when tab loses focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isOpenRef.current) {
        saveToStorage();
      }
    };

    const handleBeforeUnload = () => {
      if (isOpenRef.current) {
        saveToStorage();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [saveToStorage]);

  const updateField = useCallback((name: string, value: any) => {
    setValues(prev => {
      const updated = { ...prev, [name]: value };
      // Immediately save to localStorage on each field update
      try {
        const hasContent = Object.values(updated).some(v => v && v !== '');
        if (hasContent) {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        }
      } catch (e) {
        console.error('Failed to save form draft:', e);
      }
      return updated;
    });
  }, [storageKey]);

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
