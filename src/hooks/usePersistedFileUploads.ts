import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PersistedPhoto {
  path: string;
  previewUrl: string;
}

interface PersistedVoice {
  path: string;
  previewUrl: string;
  duration: number;
}

interface DraftState {
  photos: PersistedPhoto[];
  voice: PersistedVoice | null;
  userId: string; // Store the userId used for paths
}

const STORAGE_KEY_PREFIX = 'avatar-draft-';

export function usePersistedFileUploads(affiliateId: string | null) {
  const [photos, setPhotos] = useState<PersistedPhoto[]>([]);
  const [voice, setVoice] = useState<PersistedVoice | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [uploadingPhotoIndex, setUploadingPhotoIndex] = useState<number | null>(null);
  const [isUploadingVoice, setIsUploadingVoice] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const storageKey = affiliateId ? `${STORAGE_KEY_PREFIX}${affiliateId}` : null;

  // Get current user's auth UID (RLS requires auth.uid() as folder name)
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, []);

  // Save draft to localStorage
  const saveDraft = useCallback((newPhotos: PersistedPhoto[], newVoice: PersistedVoice | null) => {
    if (!storageKey || !userId) return;
    const draft: DraftState = { photos: newPhotos, voice: newVoice, userId };
    localStorage.setItem(storageKey, JSON.stringify(draft));
  }, [storageKey, userId]);

  // Restore draft from localStorage on mount
  useEffect(() => {
    if (!storageKey || !affiliateId || !userId) {
      if (!userId) return; // Wait for userId to load
      setIsRestoring(false);
      return;
    }

    const restoreDraft = async () => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (!saved) {
          setIsRestoring(false);
          return;
        }

        const draft: DraftState = JSON.parse(saved);
        
        // If userId changed or doesn't match, clear old draft
        if (draft.userId && draft.userId !== userId) {
          localStorage.removeItem(storageKey);
          setIsRestoring(false);
          return;
        }
        
        let restoredPhotos: PersistedPhoto[] = [];
        let restoredVoice: PersistedVoice | null = null;

        // Restore photos - get fresh signed URLs
        for (const photo of draft.photos) {
          try {
            const { data, error } = await supabase.storage
              .from('affiliate-photos')
              .createSignedUrl(photo.path, 3600);
            
            if (!error && data?.signedUrl) {
              restoredPhotos.push({ path: photo.path, previewUrl: data.signedUrl });
            }
          } catch {
            // File might have been deleted, skip it
          }
        }

        // Restore voice - get fresh signed URL
        if (draft.voice) {
          try {
            const { data, error } = await supabase.storage
              .from('affiliate-voices')
              .createSignedUrl(draft.voice.path, 3600);
            
            if (!error && data?.signedUrl) {
              restoredVoice = { 
                path: draft.voice.path, 
                previewUrl: data.signedUrl, 
                duration: draft.voice.duration 
              };
            }
          } catch {
            // File might have been deleted, skip it
          }
        }

        if (restoredPhotos.length > 0 || restoredVoice) {
          setPhotos(restoredPhotos);
          setVoice(restoredVoice);
          // Update localStorage with only valid files
          saveDraft(restoredPhotos, restoredVoice);
          toast.success(`Draft restored: ${restoredPhotos.length} photo(s)${restoredVoice ? ' + voice' : ''}`);
        }
      } catch (e) {
        console.error('Failed to restore draft:', e);
      } finally {
        setIsRestoring(false);
      }
    };

    restoreDraft();
  }, [affiliateId, storageKey, saveDraft, userId]);

  // Upload a photo immediately (uses userId for RLS compliance)
  const uploadPhoto = useCallback(async (file: File, index: number): Promise<boolean> => {
    if (!userId) {
      toast.error('User not authenticated');
      return false;
    }

    setUploadingPhotoIndex(index);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      // Use userId (auth.uid()) as folder path - RLS requires this
      const path = `${userId}/draft-photo-${index}.${ext}`;

      const { error } = await supabase.storage
        .from('affiliate-photos')
        .upload(path, file, { upsert: true });

      if (error) throw error;

      const { data: urlData, error: signedError } = await supabase.storage
        .from('affiliate-photos')
        .createSignedUrl(path, 3600);

      if (signedError || !urlData?.signedUrl) throw signedError || new Error('Failed to get signed URL');

      const newPhoto: PersistedPhoto = { path, previewUrl: urlData.signedUrl };
      
      setPhotos(prev => {
        const updated = [...prev];
        // Find if we already have a photo at this index by path pattern
        const existingIdx = updated.findIndex(p => p.path.includes(`draft-photo-${index}`));
        if (existingIdx >= 0) {
          updated[existingIdx] = newPhoto;
        } else {
          updated.push(newPhoto);
        }
        // Sort by index in path
        updated.sort((a, b) => {
          const aIdx = parseInt(a.path.match(/draft-photo-(\d+)/)?.[1] || '0');
          const bIdx = parseInt(b.path.match(/draft-photo-(\d+)/)?.[1] || '0');
          return aIdx - bIdx;
        });
        saveDraft(updated, voice);
        return updated;
      });

      toast.success(`Photo ${index + 1} saved`);
      return true;
    } catch (error: any) {
      toast.error(`Failed to upload photo: ${error.message}`);
      return false;
    } finally {
      setUploadingPhotoIndex(null);
    }
  }, [userId, voice, saveDraft]);

  // Remove a photo
  const removePhoto = useCallback(async (index: number) => {
    const photo = photos[index];
    if (!photo) return;

    try {
      await supabase.storage.from('affiliate-photos').remove([photo.path]);
    } catch {
      // Ignore deletion errors
    }

    setPhotos(prev => {
      const updated = prev.filter((_, i) => i !== index);
      saveDraft(updated, voice);
      return updated;
    });
  }, [photos, voice, saveDraft]);

  // Upload voice immediately (uses userId for RLS compliance)
  const uploadVoice = useCallback(async (file: File, duration: number): Promise<boolean> => {
    if (!userId) {
      toast.error('User not authenticated');
      return false;
    }

    setIsUploadingVoice(true);
    try {
      const ext = file.name.split('.').pop() || 'webm';
      // Use userId (auth.uid()) as folder path - RLS requires this
      const path = `${userId}/draft-voice.${ext}`;

      const { error } = await supabase.storage
        .from('affiliate-voices')
        .upload(path, file, { upsert: true });

      if (error) throw error;

      const { data: urlData, error: signedError } = await supabase.storage
        .from('affiliate-voices')
        .createSignedUrl(path, 3600);

      if (signedError || !urlData?.signedUrl) throw signedError || new Error('Failed to get signed URL');

      const newVoice: PersistedVoice = { path, previewUrl: urlData.signedUrl, duration };
      setVoice(newVoice);
      saveDraft(photos, newVoice);

      toast.success('Voice saved');
      return true;
    } catch (error: any) {
      toast.error(`Failed to upload voice: ${error.message}`);
      return false;
    } finally {
      setIsUploadingVoice(false);
    }
  }, [userId, photos, saveDraft]);

  // Clear voice
  const clearVoice = useCallback(async () => {
    if (voice) {
      try {
        await supabase.storage.from('affiliate-voices').remove([voice.path]);
      } catch {
        // Ignore deletion errors
      }
    }
    setVoice(null);
    saveDraft(photos, null);
  }, [voice, photos, saveDraft]);

  // Clear entire draft
  const clearDraft = useCallback(async () => {
    // Delete all draft files from storage
    for (const photo of photos) {
      try {
        await supabase.storage.from('affiliate-photos').remove([photo.path]);
      } catch {
        // Ignore
      }
    }
    if (voice) {
      try {
        await supabase.storage.from('affiliate-voices').remove([voice.path]);
      } catch {
        // Ignore
      }
    }

    setPhotos([]);
    setVoice(null);
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
  }, [photos, voice, storageKey]);

  // Get final signed URLs for submission (uses userId for RLS compliance)
  const getFinalUrls = useCallback(async (): Promise<{ photoUrls: string[], voiceUrl: string | null }> => {
    if (!userId) return { photoUrls: [], voiceUrl: null };

    const photoUrls: string[] = [];

    // Move/copy draft photos to final paths
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const ext = photo.path.split('.').pop() || 'jpg';
      // Use userId (auth.uid()) as folder path - RLS requires this
      const finalPath = `${userId}/photo-${i + 1}.${ext}`;

      // Download the draft file
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('affiliate-photos')
        .download(photo.path);

      if (downloadError || !fileData) {
        throw new Error(`Failed to prepare photo ${i + 1}`);
      }

      // Upload to final path
      const { error: uploadError } = await supabase.storage
        .from('affiliate-photos')
        .upload(finalPath, fileData, { upsert: true });

      if (uploadError) throw uploadError;

      // Get signed URL for final path
      const { data: urlData, error: signedError } = await supabase.storage
        .from('affiliate-photos')
        .createSignedUrl(finalPath, 3600);

      if (signedError || !urlData?.signedUrl) throw signedError || new Error('Failed to get signed URL');
      photoUrls.push(urlData.signedUrl);
    }

    let voiceUrl: string | null = null;
    if (voice) {
      const ext = voice.path.split('.').pop() || 'webm';
      // Use userId (auth.uid()) as folder path - RLS requires this
      const finalPath = `${userId}/voice.${ext}`;

      // Download the draft file
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('affiliate-voices')
        .download(voice.path);

      if (downloadError || !fileData) {
        throw new Error('Failed to prepare voice file');
      }

      // Upload to final path
      const { error: uploadError } = await supabase.storage
        .from('affiliate-voices')
        .upload(finalPath, fileData, { upsert: true });

      if (uploadError) throw uploadError;

      // Get signed URL for final path
      const { data: urlData, error: signedError } = await supabase.storage
        .from('affiliate-voices')
        .createSignedUrl(finalPath, 3600);

      if (signedError || !urlData?.signedUrl) throw signedError || new Error('Failed to get signed URL');
      voiceUrl = urlData.signedUrl;
    }

    return { photoUrls, voiceUrl };
  }, [userId, photos, voice]);

  return {
    photos,
    voice,
    isRestoring,
    uploadingPhotoIndex,
    isUploadingVoice,
    uploadPhoto,
    removePhoto,
    uploadVoice,
    clearVoice,
    clearDraft,
    getFinalUrls,
  };
}
