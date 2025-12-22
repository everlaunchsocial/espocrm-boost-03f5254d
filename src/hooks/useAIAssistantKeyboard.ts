import { useEffect, useCallback, useState } from 'react';
import { toast } from 'sonner';

interface KeyboardShortcutHandlers {
  toggleWidget: () => void;
  startRecording: () => void;
  stopRecording: () => void;
  toggleHistory: () => void;
  triggerQuickAction: (index: number) => void;
  isOpen: boolean;
  isRecording: boolean;
}

const FIRST_USE_KEY = 'ai_assistant_keyboard_hint_shown';

export function useAIAssistantKeyboard({
  toggleWidget,
  startRecording,
  stopRecording,
  toggleHistory,
  triggerQuickAction,
  isOpen,
  isRecording,
}: KeyboardShortcutHandlers) {
  const [shortcutPulse, setShortcutPulse] = useState(false);
  const [enabled, setEnabled] = useState(true);

  // Check if keyboard shortcuts are enabled (could be stored in localStorage)
  useEffect(() => {
    const stored = localStorage.getItem('ai_assistant_keyboard_enabled');
    if (stored !== null) {
      setEnabled(stored === 'true');
    }
  }, []);

  const setKeyboardEnabled = useCallback((value: boolean) => {
    setEnabled(value);
    localStorage.setItem('ai_assistant_keyboard_enabled', String(value));
  }, []);

  const triggerPulse = useCallback(() => {
    setShortcutPulse(true);
    setTimeout(() => setShortcutPulse(false), 300);
  }, []);

  const showFirstUseHint = useCallback(() => {
    const hasShown = localStorage.getItem(FIRST_USE_KEY);
    if (!hasShown) {
      toast.info('Tip: Press ⌘/Ctrl+K to toggle AI Assistant', {
        duration: 5000,
      });
      localStorage.setItem(FIRST_USE_KEY, 'true');
    }
  }, []);

  const isInputFocused = useCallback(() => {
    const activeElement = document.activeElement;
    if (!activeElement) return false;
    
    const tagName = activeElement.tagName.toLowerCase();
    const isEditable = activeElement.getAttribute('contenteditable') === 'true';
    const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select';
    
    return isInput || isEditable;
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;
    
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? event.metaKey : event.ctrlKey;

    // Escape - stop recording or close widget (works even in inputs)
    if (event.key === 'Escape') {
      if (isRecording) {
        event.preventDefault();
        stopRecording();
        triggerPulse();
        return;
      }
      if (isOpen) {
        event.preventDefault();
        toggleWidget();
        triggerPulse();
        return;
      }
    }

    // Don't trigger shortcuts when typing in inputs (except Escape handled above)
    if (isInputFocused()) return;

    // Cmd/Ctrl + K - Toggle widget
    if (modifier && event.key.toLowerCase() === 'k' && !event.shiftKey) {
      event.preventDefault();
      toggleWidget();
      triggerPulse();
      showFirstUseHint();
      return;
    }

    // Cmd/Ctrl + Shift + K - Start recording (if widget open)
    if (modifier && event.shiftKey && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (isOpen && !isRecording) {
        startRecording();
        triggerPulse();
      }
      return;
    }

    // Cmd/Ctrl + H - Toggle history panel
    if (modifier && event.key.toLowerCase() === 'h' && !event.shiftKey) {
      event.preventDefault();
      if (isOpen) {
        toggleHistory();
        triggerPulse();
      }
      return;
    }

    // Cmd/Ctrl + 1-4 - Quick actions
    if (modifier && ['1', '2', '3', '4'].includes(event.key)) {
      event.preventDefault();
      if (isOpen) {
        const index = parseInt(event.key) - 1;
        triggerQuickAction(index);
        triggerPulse();
      }
      return;
    }
  }, [
    enabled,
    isOpen,
    isRecording,
    toggleWidget,
    startRecording,
    stopRecording,
    toggleHistory,
    triggerQuickAction,
    isInputFocused,
    triggerPulse,
    showFirstUseHint
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    shortcutPulse,
    keyboardEnabled: enabled,
    setKeyboardEnabled,
  };
}

export interface KeyboardShortcut {
  keys: string[];
  description: string;
  category: 'navigation' | 'actions' | 'recording';
}

export const keyboardShortcuts: KeyboardShortcut[] = [
  { keys: ['⌘/Ctrl', 'K'], description: 'Open/close AI Assistant', category: 'navigation' },
  { keys: ['⌘/Ctrl', 'Shift', 'K'], description: 'Start voice recording', category: 'recording' },
  { keys: ['Esc'], description: 'Stop recording / Close widget', category: 'navigation' },
  { keys: ['⌘/Ctrl', '1-4'], description: 'Trigger quick actions', category: 'actions' },
  { keys: ['⌘/Ctrl', 'H'], description: 'Toggle action history', category: 'navigation' },
];
