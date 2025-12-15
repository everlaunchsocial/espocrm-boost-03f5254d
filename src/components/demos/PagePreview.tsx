import { useState } from 'react';
import { MobileDeviceMockup } from './MobileDeviceMockup';
import { ChatButtonOverlay } from './ChatButtonOverlay';
import { DemoChat } from './DemoChat';

interface PagePreviewProps {
  screenshot: string;
  demoId: string;
  businessName?: string;
  aiPersonaName?: string;
  avatarUrl?: string;
  onChatInteraction?: () => void;
}

export const PagePreview = ({ 
  screenshot, 
  demoId,
  businessName,
  aiPersonaName,
  avatarUrl,
  onChatInteraction 
}: PagePreviewProps) => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <MobileDeviceMockup>
      <div className="relative w-full h-full overflow-y-auto">
        <img 
          src={screenshot} 
          alt="Mobile page screenshot" 
          className="w-full"
        />
        {!isChatOpen && (
          <ChatButtonOverlay onClick={() => setIsChatOpen(true)} />
        )}
        <DemoChat 
          isOpen={isChatOpen} 
          onClose={() => setIsChatOpen(false)}
          demoId={demoId}
          businessName={businessName}
          aiPersonaName={aiPersonaName}
          avatarUrl={avatarUrl}
          onFirstMessage={onChatInteraction}
        />
      </div>
    </MobileDeviceMockup>
  );
};
