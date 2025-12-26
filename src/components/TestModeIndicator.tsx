import { useTestMode } from '@/hooks/useTestMode';
import { TestTube } from 'lucide-react';

/**
 * Shows a small indicator when test mode is active.
 * Visible to automation tools and testers.
 */
export function TestModeIndicator() {
  const { enabled } = useTestMode();

  if (!enabled) return null;

  return (
    <div 
      className="fixed bottom-4 right-4 z-[9999] bg-yellow-500 text-yellow-950 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-lg"
      data-testid="test-mode-indicator"
    >
      <TestTube className="w-3.5 h-3.5" />
      <span>Test Mode</span>
    </div>
  );
}
