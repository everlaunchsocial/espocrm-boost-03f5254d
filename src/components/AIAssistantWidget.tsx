import { useState } from 'react';
import { Mic, MicOff, X, Loader2, Volume2, Minimize2, Maximize2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAIAssistant, AIAssistantState } from '@/hooks/useAIAssistant';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { cn } from '@/lib/utils';

interface AIAssistantWidgetProps {
  className?: string;
}

export function AIAssistantWidget({ className }: AIAssistantWidgetProps) {
  const {
    state,
    aiResponse,
    isOpen,
    actionInProgress,
    pageContext,
    startSession,
    endSession,
    toggleOpen
  } = useAIAssistant();

  const { isEnabled } = useFeatureFlags();
  const [isMinimized, setIsMinimized] = useState(false);

  // Don't render if feature flag is disabled
  if (!isEnabled('aiCrmPhase3')) {
    return null;
  }

  const getStateLabel = (state: AIAssistantState) => {
    switch (state) {
      case 'connecting':
        return 'Connecting...';
      case 'listening':
        return 'Listening...';
      case 'processing':
        return 'Processing...';
      case 'speaking':
        return 'AI Speaking...';
      default:
        return 'Click to start';
    }
  };

  const getStateIcon = (state: AIAssistantState) => {
    switch (state) {
      case 'connecting':
        return <Loader2 className="h-5 w-5 animate-spin" />;
      case 'listening':
        return <Mic className="h-5 w-5 animate-pulse text-green-400" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin" />;
      case 'speaking':
        return <Volume2 className="h-5 w-5 animate-pulse text-blue-400" />;
      default:
        return <Mic className="h-5 w-5" />;
    }
  };

  const getContextLabel = () => {
    if (!pageContext?.entityType || !pageContext?.entityName) return null;
    
    const typeLabels = {
      lead: 'Lead',
      demo: 'Demo',
      contact: 'Contact'
    };
    
    return `${typeLabels[pageContext.entityType]}: ${pageContext.entityName}`;
  };

  const contextLabel = getContextLabel();

  // Floating button when closed
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {/* Context badge above button */}
        {contextLabel && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-full shadow-lg text-xs font-medium text-muted-foreground animate-in fade-in slide-in-from-bottom-2">
            <MapPin className="h-3 w-3 text-primary" />
            <span className="max-w-[180px] truncate">{contextLabel}</span>
          </div>
        )}
        <Button
          onClick={toggleOpen}
          size="lg"
          className={cn(
            "rounded-full h-14 w-14 shadow-lg",
            "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
            "transition-all duration-300 hover:scale-110",
            className
          )}
        >
          <Mic className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  // Expanded widget when open
  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 bg-card border border-border rounded-2xl shadow-2xl",
        "transition-all duration-300",
        isMinimized ? "w-72 h-16" : "w-80 h-auto max-h-[450px]",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className={cn(
            "h-2 w-2 rounded-full",
            state === 'idle' ? "bg-muted" :
            state === 'connecting' ? "bg-yellow-500 animate-pulse" :
            state === 'listening' ? "bg-green-500 animate-pulse" :
            state === 'speaking' ? "bg-blue-500 animate-pulse" :
            "bg-primary"
          )} />
          <span className="text-sm font-medium">AI Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? (
              <Maximize2 className="h-4 w-4" />
            ) : (
              <Minimize2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={toggleOpen}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Context Badge */}
          {contextLabel && (
            <div className="px-4 pt-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/10 rounded-lg text-xs">
                <MapPin className="h-3 w-3 text-primary flex-shrink-0" />
                <span className="text-primary font-medium truncate">
                  Viewing: {contextLabel}
                </span>
                {pageContext?.entityStatus && (
                  <span className="text-muted-foreground">
                    ({pageContext.entityStatus})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Status & Response Area */}
          <div className="p-4 space-y-3">
            {/* Status */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {getStateIcon(state)}
              <span>{getStateLabel(state)}</span>
            </div>

            {/* Action in progress */}
            {actionInProgress && (
              <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-primary font-medium">{actionInProgress}</span>
              </div>
            )}

            {/* AI Response */}
            {aiResponse && (
              <div className="max-h-40 overflow-y-auto text-sm text-foreground bg-muted/50 rounded-lg p-3">
                {aiResponse}
              </div>
            )}

            {/* Hint text when idle */}
            {state === 'idle' && !aiResponse && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Try saying:</p>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground/80">
                  {contextLabel ? (
                    <>
                      <li>"Send an email to this {pageContext?.entityType}"</li>
                      <li>"Create a follow-up for this {pageContext?.entityType}"</li>
                      <li>"What's the status of this {pageContext?.entityType}?"</li>
                    </>
                  ) : (
                    <>
                      <li>"Book a demo for Jimmy's Pizza"</li>
                      <li>"What are my appointments today?"</li>
                      <li>"Send an email to my last lead"</li>
                      <li>"Who do I need to follow up with?"</li>
                    </>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="p-4 pt-0">
            {state === 'idle' ? (
              <Button
                onClick={startSession}
                className="w-full gap-2"
                size="lg"
              >
                <Mic className="h-5 w-5" />
                Start Voice Assistant
              </Button>
            ) : (
              <Button
                onClick={endSession}
                variant="destructive"
                className="w-full gap-2"
                size="lg"
              >
                <MicOff className="h-5 w-5" />
                End Session
              </Button>
            )}
          </div>
        </>
      )}

      {/* Minimized state - show quick controls */}
      {isMinimized && (
        <div className="flex items-center justify-center h-full px-4">
          {state === 'idle' ? (
            <Button onClick={startSession} size="sm" className="gap-2">
              <Mic className="h-4 w-4" />
              Start
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                {getStateIcon(state)}
                <span className="text-muted-foreground">{getStateLabel(state)}</span>
              </div>
              <Button onClick={endSession} variant="destructive" size="sm">
                <MicOff className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
