import { useState, useEffect, useCallback } from 'react';

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'voice-notes';

const generateId = () => `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const getTitle = (content: string): string => {
  const firstLine = content.trim().split('\n')[0];
  if (!firstLine) return 'Untitled Note';
  return firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
};

export const useLocalNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  // Load notes from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Note[];
        setNotes(parsed);
        if (parsed.length > 0) {
          setActiveNoteId(parsed[0].id);
        }
      } catch (e) {
        console.error('Failed to parse saved notes:', e);
      }
    }
  }, []);

  // Save notes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  const activeNote = notes.find(n => n.id === activeNoteId) || null;

  const createNote = useCallback(() => {
    const newNote: Note = {
      id: generateId(),
      title: 'New Note',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotes(prev => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
    return newNote;
  }, []);

  const updateNote = useCallback((id: string, content: string) => {
    setNotes(prev => prev.map(note => {
      if (note.id !== id) return note;
      return {
        ...note,
        content,
        title: getTitle(content),
        updatedAt: new Date().toISOString(),
      };
    }));
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => {
      const filtered = prev.filter(n => n.id !== id);
      // If we deleted the active note, switch to the first remaining one
      if (activeNoteId === id && filtered.length > 0) {
        setActiveNoteId(filtered[0].id);
      } else if (filtered.length === 0) {
        setActiveNoteId(null);
      }
      return filtered;
    });
  }, [activeNoteId]);

  const selectNote = useCallback((id: string) => {
    setActiveNoteId(id);
  }, []);

  return {
    notes,
    activeNote,
    activeNoteId,
    createNote,
    updateNote,
    deleteNote,
    selectNote,
  };
};
