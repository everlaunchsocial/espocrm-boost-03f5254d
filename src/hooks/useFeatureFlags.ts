import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FeatureFlags {
  aiCrmPhase1: boolean;
  aiCrmPhase2: boolean;
}

interface FeatureFlagsStore {
  flags: FeatureFlags;
  setFlag: (key: keyof FeatureFlags, value: boolean) => void;
  isEnabled: (key: keyof FeatureFlags) => boolean;
}

// Determine environment - default to enabled for dev/staging
const isProduction = typeof window !== 'undefined' && 
  window.location.hostname !== 'localhost' && 
  !window.location.hostname.includes('preview') &&
  !window.location.hostname.includes('staging');

const defaultFlags: FeatureFlags = {
  aiCrmPhase1: !isProduction, // ON for dev/staging, OFF for production
  aiCrmPhase2: !isProduction, // ON for dev/staging, OFF for production
};

export const useFeatureFlags = create<FeatureFlagsStore>()(
  persist(
    (set, get) => ({
      flags: defaultFlags,
      setFlag: (key, value) => 
        set((state) => ({
          flags: { ...state.flags, [key]: value }
        })),
      isEnabled: (key) => get().flags[key],
    }),
    {
      name: 'feature-flags',
    }
  )
);
