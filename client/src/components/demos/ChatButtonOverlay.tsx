import { MessageCircle } from 'lucide-react';

interface ChatButtonOverlayProps {
  onClick: () => void;
}

export const ChatButtonOverlay = ({ onClick }: ChatButtonOverlayProps) => {
  return (
    <button
      onClick={onClick}
      className="absolute bottom-6 right-4 z-10 w-14 h-14 rounded-full bg-primary shadow-glow flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
      aria-label="Open chat"
    >
      <MessageCircle className="h-6 w-6 text-primary-foreground" />
    </button>
  );
};
