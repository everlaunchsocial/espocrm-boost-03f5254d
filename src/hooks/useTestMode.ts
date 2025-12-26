import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const TEST_MODE_KEY = 'everlaunch-test-mode-2024';

interface TestModeState {
  enabled: boolean;
  activatedAt: string | null;
  testKey: string | null;
  capabilities: string[];
}

interface TestModeStore extends TestModeState {
  enableTestMode: (key: string) => boolean;
  disableTestMode: () => void;
  isValidKey: (key: string) => boolean;
}

// Valid test keys - in production, these would be environment variables
const VALID_TEST_KEYS = [
  TEST_MODE_KEY,
  'testdriver-ai-2024',
  'automation-test-key',
];

export const useTestMode = create<TestModeStore>()(
  persist(
    (set, get) => ({
      enabled: false,
      activatedAt: null,
      testKey: null,
      capabilities: ['auto-login', 'skip-animations', 'fast-mode', 'bypass-guards'],
      
      isValidKey: (key: string) => {
        return VALID_TEST_KEYS.includes(key);
      },
      
      enableTestMode: (key: string) => {
        if (get().isValidKey(key)) {
          set({
            enabled: true,
            activatedAt: new Date().toISOString(),
            testKey: key,
          });
          
          // Expose to window for automation tools
          if (typeof window !== 'undefined') {
            (window as any).__EVERLAUNCH_TEST_MODE__ = {
              enabled: true,
              version: '1.0',
              capabilities: get().capabilities,
              activatedAt: new Date().toISOString(),
            };
          }
          
          console.log('[TestMode] Enabled with key:', key.substring(0, 4) + '...');
          return true;
        }
        console.warn('[TestMode] Invalid key attempted');
        return false;
      },
      
      disableTestMode: () => {
        set({
          enabled: false,
          activatedAt: null,
          testKey: null,
        });
        
        if (typeof window !== 'undefined') {
          delete (window as any).__EVERLAUNCH_TEST_MODE__;
        }
        
        console.log('[TestMode] Disabled');
      },
    }),
    {
      name: 'test-mode-storage',
      version: 1,
    }
  )
);

// Check URL params on load
export function initTestModeFromUrl() {
  if (typeof window === 'undefined') return;
  
  const params = new URLSearchParams(window.location.search);
  const testKey = params.get('testMode') || params.get('testKey');
  
  if (testKey) {
    const store = useTestMode.getState();
    if (store.enableTestMode(testKey)) {
      // Remove the key from URL for security
      const url = new URL(window.location.href);
      url.searchParams.delete('testMode');
      url.searchParams.delete('testKey');
      window.history.replaceState({}, '', url.toString());
    }
  }
  
  // Restore window object if already enabled
  const state = useTestMode.getState();
  if (state.enabled && typeof window !== 'undefined') {
    (window as any).__EVERLAUNCH_TEST_MODE__ = {
      enabled: true,
      version: '1.0',
      capabilities: state.capabilities,
      activatedAt: state.activatedAt,
    };
  }
}

// Hook to get test mode status with auto-init
export function useTestModeStatus() {
  const store = useTestMode();
  return {
    isTestMode: store.enabled,
    capabilities: store.capabilities,
    activatedAt: store.activatedAt,
  };
}
