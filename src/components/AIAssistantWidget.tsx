import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Mic, MicOff, X, Loader2, Volume2, Minimize2, Maximize2, MapPin, ChevronDown, ChevronUp, Mail, Calendar, FileText, Phone, CheckCircle, XCircle, Clock, BarChart3, ListTodo, Users, Keyboard, Copy, Trash2, Download, MessageSquare, User, Bot, Wrench, Sparkles, Settings, Wifi, WifiOff, AlertCircle, RefreshCw, Send, ExternalLink, Minus, Expand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAIAssistant, AIAssistantState, ActionHistoryItem, ConversationMessage, SuggestedQuestion, ConnectionStatus, AIError } from '@/hooks/useAIAssistant';
import { useAIAssistantKeyboard, keyboardShortcuts } from '@/hooks/useAIAssistantKeyboard';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useUserRole } from '@/hooks/useUserRole';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import { AIAssistantVoiceSettings } from './AIAssistantVoiceSettings';

interface AIAssistantWidgetProps {
  className?: string;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  command: string;
  roles: ('affiliate' | 'customer' | 'admin')[];
}

const quickActions: QuickAction[] = [
  { 
    id: 'today', 
    label: 'Today', 
    icon: <Calendar className="h-3.5 w-3.5" />, 
    command: "What's on my calendar today?", 
    roles: ['affiliate', 'customer', 'admin'] 
  },
  { 
    id: 'demos', 
    label: 'My Demos', 
    icon: <BarChart3 className="h-3.5 w-3.5" />, 
    command: 'Show me my demo stats', 
    roles: ['affiliate', 'admin'] 
  },
  { 
    id: 'followups', 
    label: 'Follow-Ups', 
    icon: <ListTodo className="h-3.5 w-3.5" />, 
    command: "What follow-ups do I have?", 
    roles: ['affiliate', 'admin'] 
  },
  { 
    id: 'leads', 
    label: 'Leads', 
    icon: <Users className="h-3.5 w-3.5" />, 
    command: 'Show me my leads', 
    roles: ['affiliate', 'admin'] 
  },
  { 
    id: 'usage', 
    label: 'Usage', 
    icon: <BarChart3 className="h-3.5 w-3.5" />, 
    command: "What's my usage this month?", 
    roles: ['customer'] 
  },
];

const getActionIcon = (toolName: string) => {
  switch (toolName) {
    case 'send_email':
      return <Mail className="h-3.5 w-3.5" />;
    case 'book_demo':
    case 'get_appointments':
      return <Calendar className="h-3.5 w-3.5" />;
    case 'create_task':
    case 'get_leads':
    case 'get_follow_ups':
    case 'get_demo_stats':
    case 'quick_action':
      return <FileText className="h-3.5 w-3.5" />;
    default:
      return <Phone className="h-3.5 w-3.5" />;
  }
};

export function AIAssistantWidget({ className }: AIAssistantWidgetProps) {
  const {
    state,
    connectionStatus,
    aiResponse,
    isOpen,
    actionInProgress,
    pageContext,
    actionHistory,
    conversationMessages,
    suggestedQuestions,
    suggestionsLoading,
    currentError,
    isTextInputMode,
    microphonePermission,
    startSession,
    endSession,
    toggleOpen,
    closeWidget,
    sendTextCommand,
    clearConversation,
    clearError,
    retrySession
  } = useAIAssistant();

  const { isEnabled } = useFeatureFlags();
  const { role } = useUserRole();
  const isMobile = useIsMobile();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(true);
  const [selectedAction, setSelectedAction] = useState<ActionHistoryItem | null>(null);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [textInput, setTextInput] = useState('');
  
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (transcriptEndRef.current && isTranscriptExpanded) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversationMessages, isTranscriptExpanded]);

  // Filter quick actions based on user role
  const filteredQuickActions = useMemo(() => {
    // Map super_admin to admin for quick actions
    const userRole = (role === 'admin' || role === 'super_admin') ? 'admin' : role === 'customer' ? 'customer' : 'affiliate';
    return quickActions.filter(action => action.roles.includes(userRole));
  }, [role]);

  const isProcessing = state === 'connecting' || state === 'processing';
  const isRecording = state === 'listening' || state === 'speaking';

  // Copy message to clipboard
  const copyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  }, []);

  // Export transcript as text file
  const exportTranscript = useCallback(() => {
    if (conversationMessages.length === 0) {
      toast.error('No messages to export');
      return;
    }

    const text = conversationMessages.map(msg => {
      const speaker = msg.role === 'user' ? 'You' : msg.role === 'error' ? 'Error' : 'AI Assistant';
      const time = format(msg.timestamp, 'HH:mm');
      return `[${time}] ${speaker}: ${msg.content}`;
    }).join('\n\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-assistant-transcript-${format(new Date(), 'yyyy-MM-dd-HHmm')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Transcript exported');
  }, [conversationMessages]);

  // Handle text input submission
  const handleTextSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    
    sendTextCommand(textInput.trim());
    setTextInput('');
  }, [textInput, sendTextCommand]);

  // Keyboard shortcut handlers
  const handleToggleHistory = useCallback(() => {
    setIsHistoryExpanded(prev => !prev);
  }, []);

  const handleTriggerQuickAction = useCallback((index: number) => {
    if (index >= 0 && index < filteredQuickActions.length && state !== 'idle') {
      const action = filteredQuickActions[index];
      sendTextCommand(action.command, action.label);
    }
  }, [filteredQuickActions, state, sendTextCommand]);

  const { shortcutPulse, keyboardEnabled, setKeyboardEnabled } = useAIAssistantKeyboard({
    toggleWidget: toggleOpen,
    startRecording: startSession,
    stopRecording: endSession,
    toggleHistory: handleToggleHistory,
    triggerQuickAction: handleTriggerQuickAction,
    isOpen,
    isRecording,
  });

  const isPrivilegedUser = role === 'admin' || role === 'super_admin';

  if (!isPrivilegedUser && !isEnabled('aiCrmPhase3')) {
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

  const getConnectionStatusInfo = (status: ConnectionStatus) => {
    switch (status) {
      case 'online':
        return { color: 'bg-green-500', label: 'Connected', icon: <Wifi className="h-3 w-3" /> };
      case 'connecting':
        return { color: 'bg-yellow-500 animate-pulse', label: 'Connecting...', icon: <Loader2 className="h-3 w-3 animate-spin" /> };
      case 'offline':
        return { color: 'bg-red-500', label: 'Offline', icon: <WifiOff className="h-3 w-3" /> };
      case 'error':
        return { color: 'bg-red-500', label: 'Error', icon: <AlertCircle className="h-3 w-3" /> };
      default:
        return { color: 'bg-muted', label: 'Not connected', icon: null };
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
  const statusInfo = getConnectionStatusInfo(connectionStatus);
  const isOffline = connectionStatus === 'offline';

  const suppressNextFloatingClickRef = useRef(false);

  // Mobile Safari can fire touch + click; also ensure this never submits surrounding forms (type="button")
  const handleFloatingButtonTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    suppressNextFloatingClickRef.current = true;
    window.setTimeout(() => {
      suppressNextFloatingClickRef.current = false;
    }, 450);

    toggleOpen();
  }, [toggleOpen]);

  const handleFloatingButtonClick = useCallback((e: React.MouseEvent) => {
    if (suppressNextFloatingClickRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    toggleOpen();
  }, [toggleOpen]);

  // Mobile: tap outside to close (UI only)
  const handleBackdropClick = useCallback(() => {
    if (isMobile) {
      setIsMinimized(false);
      toggleOpen();
    }
  }, [isMobile, toggleOpen]);

  // Floating button when closed
  if (!isOpen) {
    return (
      <div 
        className={cn(
          "fixed flex flex-col items-end gap-2",
          isMobile ? "bottom-20 right-4" : "bottom-6 right-6"
        )}
        style={{ zIndex: 99999 }}
      >
        {contextLabel && !isMobile && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-full shadow-lg text-xs font-medium text-muted-foreground animate-in fade-in slide-in-from-bottom-2">
            <MapPin className="h-3 w-3 text-primary" />
            <span className="max-w-[180px] truncate">{contextLabel}</span>
          </div>
        )}
        <div className="relative group">
          <Button
            type="button"
            onClick={handleFloatingButtonClick}
            onTouchEnd={handleFloatingButtonTouchEnd}
            size="lg"
            className={cn(
              "rounded-full shadow-lg select-none",
              isMobile ? "h-14 w-14 min-h-[56px] min-w-[56px]" : "h-14 w-14",
              "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
              "transition-all duration-300 hover:scale-110 active:scale-95",
              shortcutPulse && "ring-4 ring-primary/50 animate-pulse",
              className
            )}
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            <Mic className={isMobile ? "h-6 w-6" : "h-6 w-6"} />
          </Button>
          {/* Keyboard shortcut hint on hover - hide on mobile */}
          {!isMobile && (
            <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg border border-border whitespace-nowrap">
                <span className="text-muted-foreground">Press </span>
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">⌘K</kbd>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Expanded widget when open
  return (
    <>
      {/* Mobile backdrop overlay */}
      {isMobile && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
          style={{ zIndex: 99998 }}
          onClick={handleBackdropClick}
        />
      )}
      
      <div
        className={cn(
          "fixed bg-card border shadow-2xl",
          "transition-all duration-300 flex flex-col",
          // Mobile: bottom sheet style
          isMobile ? [
            "left-0 right-0 bottom-0",
            "rounded-t-[20px] rounded-b-none",
            isMinimized ? "h-16" : "max-h-[85vh]",
            "animate-in slide-in-from-bottom duration-300"
          ] : [
            // Desktop: floating widget
            "right-6 rounded-2xl",
            isMinimized ? "w-72 h-16 bottom-6" : 
              isFullscreen ? "w-[500px] bottom-5" : "w-80 bottom-5",
            !isMinimized && "max-h-[calc(100vh-100px)]"
          ],
          shortcutPulse ? "border-primary ring-2 ring-primary/30" : "border-border",
          className
        )}
        style={{ zIndex: 99999 }}
      >
        {/* Mobile drag handle */}
        {isMobile && !isMinimized && (
          <div className="flex justify-center py-2 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>
        )}
        
        {/* Header */}
        <div className={cn(
          "flex items-center justify-between border-b border-border flex-shrink-0",
          isMobile ? "px-4 py-2" : "px-4 py-3"
        )}>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn("h-2.5 w-2.5 rounded-full cursor-help", statusInfo.color)} />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <div className="flex items-center gap-1.5">
                    {statusInfo.icon}
                    <span>{statusInfo.label}</span>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="text-sm font-medium">AI Assistant</span>
            {isTextInputMode && (
              <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">Text Mode</span>
            )}
          </div>
          {/* Button order: Settings | Minimize | Fullscreen | Close */}
          <div className="flex items-center gap-0.5">
            {/* Settings */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(isMobile ? "h-10 w-10" : "h-7 w-7")}
              onClick={() => setShowVoiceSettings(true)}
              title="Voice settings"
            >
              <Settings className={isMobile ? "h-5 w-5" : "h-4 w-4"} />
            </Button>
            {/* Minimize */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(isMobile ? "h-10 w-10" : "h-7 w-7")}
              onClick={() => {
                // Mobile: collapse to the floating button
                if (isMobile) {
                  setIsMinimized(false);
                  toggleOpen();
                  return;
                }
                // Desktop: keep the compact header mode
                setIsMinimized(!isMinimized);
              }}
              title={isMobile ? "Minimize" : (isMinimized ? "Expand" : "Minimize")}
            >
              {isMobile ? (
                <Minimize2 className="h-5 w-5" />
              ) : isMinimized ? (
                <Maximize2 className="h-4 w-4" />
              ) : (
                <Minus className="h-4 w-4" />
              )}
            </Button>
            {/* Fullscreen (desktop only) */}
            {!isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? "Normal size" : "Fullscreen"}
              >
                <Expand className="h-4 w-4" />
              </Button>
            )}
            {/* Close */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                isMobile ? "h-10 w-10" : "h-7 w-7",
                "hover:bg-destructive/10 hover:text-destructive"
              )}
              onClick={() => {
                // Close UI (do not end session)
                setIsMinimized(false);
                toggleOpen();
              }}
              title="Close widget"
            >
              <X className={isMobile ? "h-5 w-5" : "h-4 w-4"} />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {/* Context Badge */}
            {contextLabel && (
              <div className="px-4 pt-3 flex-shrink-0">
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
            <div className="p-4 space-y-3 flex-shrink-0">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {getStateIcon(state)}
                <span>{getStateLabel(state)}</span>
              </div>

              {actionInProgress && (
                <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg text-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-primary font-medium">{actionInProgress}</span>
                </div>
              )}

              {aiResponse && (
                <div className="max-h-24 overflow-y-auto text-sm text-foreground bg-muted/50 rounded-lg p-3">
                  {aiResponse}
                </div>
              )}

              {state === 'idle' && !aiResponse && actionHistory.length === 0 && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Try saying:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-muted-foreground/80">
                    {contextLabel ? (
                      <>
                        <li>"Send an email to this {pageContext?.entityType}"</li>
                        <li>"Create a follow-up for this {pageContext?.entityType}"</li>
                      </>
                    ) : (
                      <>
                        <li>"Book a demo for Jimmy's Pizza"</li>
                        <li>"What's on my calendar?"</li>
                      </>
                    )}
                  </ul>
                </div>
              )}
            </div>

            {/* Conversation Transcript Panel */}
            <div className="border-t border-border flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
                <button
                  onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Conversation {conversationMessages.length > 0 && `(${conversationMessages.length})`}
                  </span>
                  {isTranscriptExpanded ? (
                    <ChevronUp className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  )}
                </button>
                
                {conversationMessages.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={exportTranscript}
                      title="Export transcript"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          title="Clear transcript"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Clear Conversation?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove all messages from the current transcript. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={clearConversation}>Clear</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>

              <div className={cn(
                "transition-all duration-300 flex-1 min-h-0",
                isTranscriptExpanded ? "flex flex-col" : "hidden"
              )}>
                {conversationMessages.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground/70">
                      Start talking to see the conversation here...
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-2 min-h-[100px] max-h-[200px]">
                    {conversationMessages.map((msg, index) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex gap-2 group",
                          msg.role === 'user' ? "justify-end" : "justify-start"
                        )}
                      >
                        {msg.role === 'assistant' && (
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bot className="h-3 w-3 text-primary" />
                          </div>
                        )}
                        
                        <div className={cn(
                          "max-w-[85%] rounded-lg px-2.5 py-1.5 relative",
                          msg.role === 'user' 
                            ? "bg-primary text-primary-foreground" 
                            : index % 2 === 0 ? "bg-muted" : "bg-muted/60"
                        )}>
                          <p className="text-xs leading-relaxed break-words">{msg.content}</p>
                          
                          <div className={cn(
                            "flex items-center gap-1.5 mt-1",
                            msg.role === 'user' ? "justify-end" : "justify-start"
                          )}>
                            <span className={cn(
                              "text-[10px]",
                              msg.role === 'user' ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}>
                              {format(msg.timestamp, 'HH:mm')}
                            </span>
                            
                            {msg.toolName && (
                              <span className={cn(
                                "flex items-center gap-0.5 text-[10px]",
                                msg.role === 'user' ? "text-primary-foreground/70" : "text-muted-foreground"
                              )}>
                                <Wrench className="h-2.5 w-2.5" />
                                {msg.toolName.replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>
                          
                          {/* Copy button - shows on hover */}
                          <button
                            onClick={() => copyMessage(msg.content)}
                            className={cn(
                              "absolute -right-1 -top-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity",
                              msg.role === 'user' 
                                ? "bg-primary-foreground/20 hover:bg-primary-foreground/30" 
                                : "bg-muted-foreground/10 hover:bg-muted-foreground/20"
                            )}
                            title="Copy message"
                          >
                            <Copy className="h-2.5 w-2.5" />
                          </button>
                        </div>
                        
                        {msg.role === 'user' && (
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-secondary flex items-center justify-center">
                            <User className="h-3 w-3 text-secondary-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={transcriptEndRef} />
                  </div>
                )}
              </div>
            </div>

            {/* Action History Panel */}
            <div className="border-t border-border flex-shrink-0">
              <button
                onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                className="w-full flex items-center justify-between px-4 py-2 hover:bg-muted/50 transition-colors"
              >
                <span className="text-xs font-medium text-muted-foreground">
                  Recent Actions {actionHistory.length > 0 && `(${actionHistory.length})`}
                </span>
                {isHistoryExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>

              <div className={cn(
                "overflow-hidden transition-all duration-300",
                isHistoryExpanded ? "max-h-40" : "max-h-0"
              )}>
                {actionHistory.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-muted-foreground/70 text-center">
                    No actions yet. Try "What's on my calendar?"
                  </div>
                ) : (
                  <div className="max-h-40 overflow-y-auto">
                    {actionHistory.map((action, index) => (
                      <button
                        key={action.id}
                        onClick={() => setSelectedAction(action)}
                        className={cn(
                          "w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-muted/80 transition-colors",
                          index % 2 === 0 ? "bg-muted/30" : "bg-transparent"
                        )}
                      >
                        <div className={cn(
                          "flex-shrink-0 p-1 rounded",
                          action.success ? "text-primary" : "text-destructive"
                        )}>
                          {getActionIcon(action.toolName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{action.summary}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <Clock className="h-2.5 w-2.5" />
                            <span>{formatDistanceToNow(action.timestamp, { addSuffix: true })}</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {action.success ? (
                            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-destructive" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Suggested Questions */}
            {state !== 'idle' && suggestedQuestions.length > 0 && (
              <div className="px-4 py-2 border-t border-border flex-shrink-0">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                    Suggested
                  </span>
                  {suggestionsLoading && (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-auto" />
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 sm:flex-nowrap sm:overflow-x-auto">
                  {suggestedQuestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={() => sendTextCommand(suggestion.text)}
                      disabled={isProcessing}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs",
                        "bg-primary/10 hover:bg-primary/20 text-foreground",
                        "border border-primary/20 hover:border-primary/30",
                        "transition-all duration-200 animate-in fade-in slide-in-from-bottom-1",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "focus:outline-none focus:ring-2 focus:ring-primary/20"
                      )}
                    >
                      <span>{suggestion.icon}</span>
                      <span className="whitespace-nowrap max-w-[120px] truncate sm:max-w-none">
                        {suggestion.text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions Bar */}
            {state !== 'idle' && (
              <div className="px-4 py-2 border-t border-border flex-shrink-0">
                <div className="flex flex-wrap gap-1.5 sm:flex-nowrap sm:overflow-x-auto">
                  {filteredQuickActions.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => sendTextCommand(action.command, action.label)}
                      disabled={isProcessing}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium",
                        "bg-muted/60 hover:bg-muted text-foreground",
                        "border border-border/50 hover:border-border",
                        "transition-all duration-200",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "focus:outline-none focus:ring-2 focus:ring-primary/20"
                      )}
                    >
                      {action.icon}
                      <span className="whitespace-nowrap">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Error Banner */}
            {currentError && (
              <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20 flex-shrink-0">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-destructive font-medium">{currentError.message}</p>
                    {currentError.type === 'microphone' && (
                      <a href="https://support.google.com/chrome/answer/2693767" target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-1 mt-1">
                        How to enable microphone <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {currentError.retryAction && (
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={retrySession}>
                        <RefreshCw className="h-3 w-3 mr-1" /> Retry
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={clearError}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Text Input (fallback mode) */}
            {(isTextInputMode || state !== 'idle') && (
              <form onSubmit={handleTextSubmit} className="px-4 py-2 border-t border-border flex-shrink-0">
                <div className="flex gap-2">
                  <Input
                    ref={textInputRef}
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder={isTextInputMode ? "Type your message..." : "Or type here..."}
                    className="h-9 text-sm"
                    disabled={state === 'idle' && !isTextInputMode}
                  />
                  <Button type="submit" size="sm" className="h-9 px-3" disabled={!textInput.trim() || (state === 'idle' && !isTextInputMode)}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            )}

            {/* Controls */}
            <div className={cn(
              "border-t border-border flex-shrink-0",
              isMobile ? "p-4 pb-6" : "p-4 pt-2"
            )}>
              {state === 'idle' ? (
                <Button
                  onClick={startSession}
                  className={cn("w-full gap-2", isMobile && "h-12 text-base")}
                  size="lg"
                  disabled={isOffline}
                >
                  {isOffline ? <WifiOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  {isOffline ? "Offline" : (isTextInputMode ? "Try Voice Again" : "Start Voice Assistant")}
                </Button>
              ) : (
                <Button
                  onClick={endSession}
                  variant="destructive"
                  className={cn("w-full gap-2", isMobile && "h-12 text-base")}
                  size="lg"
                >
                  <MicOff className="h-5 w-5" />
                  End Session
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Minimized state */}
        {isMinimized && (
          <div className={cn(
            "flex items-center justify-center h-full",
            isMobile ? "px-4 pb-4" : "px-4"
          )}>
            {state === 'idle' ? (
              <Button 
                onClick={startSession} 
                size={isMobile ? "lg" : "sm"} 
                className={cn("gap-2", isMobile && "h-11")} 
                disabled={isOffline}
              >
                {isOffline ? <WifiOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {isOffline ? "Offline" : "Start"}
              </Button>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                  {getStateIcon(state)}
                  <span className="text-muted-foreground">{getStateLabel(state)}</span>
                </div>
                <Button 
                  onClick={endSession} 
                  variant="destructive" 
                  size={isMobile ? "lg" : "sm"}
                  className={isMobile ? "h-11" : ""}
                >
                  <MicOff className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Detail Modal */}
      <Dialog open={!!selectedAction} onOpenChange={(open) => !open && setSelectedAction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAction && getActionIcon(selectedAction.toolName)}
              <span>{selectedAction?.summary}</span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedAction && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                {selectedAction.success ? (
                  <span className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" /> Success
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-sm text-destructive">
                    <XCircle className="h-4 w-4" /> Failed
                  </span>
                )}
              </div>

              <div>
                <span className="text-sm font-medium">Tool:</span>
                <p className="text-sm text-muted-foreground font-mono">{selectedAction.toolName}</p>
              </div>

              <div>
                <span className="text-sm font-medium">Time:</span>
                <p className="text-sm text-muted-foreground">
                  {selectedAction.timestamp.toLocaleString()}
                </p>
              </div>

              {selectedAction.parameters && Object.keys(selectedAction.parameters).length > 0 && (
                <div>
                  <span className="text-sm font-medium">Parameters:</span>
                  <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify(selectedAction.parameters, null, 2)}
                  </pre>
                </div>
              )}

              {selectedAction.result && (
                <div>
                  <span className="text-sm font-medium">Result:</span>
                  <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify(selectedAction.result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Keyboard Shortcuts Modal */}
      <Dialog open={showShortcutsModal} onOpenChange={setShowShortcutsModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </DialogTitle>
            <DialogDescription>
              Control the AI Assistant with your keyboard
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Settings toggle */}
            <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
              <Label htmlFor="keyboard-enabled" className="text-sm font-medium cursor-pointer">
                Enable keyboard shortcuts
              </Label>
              <Switch
                id="keyboard-enabled"
                checked={keyboardEnabled}
                onCheckedChange={setKeyboardEnabled}
              />
            </div>

            {/* Shortcuts list */}
            <div className="space-y-3">
              {keyboardShortcuts.map((shortcut, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, keyIndex) => (
                      <span key={keyIndex} className="flex items-center">
                        <kbd className="px-2 py-1 bg-muted text-xs font-mono rounded border border-border">
                          {key}
                        </kbd>
                        {keyIndex < shortcut.keys.length - 1 && (
                          <span className="mx-0.5 text-muted-foreground">+</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick actions note */}
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Quick actions (⌘1-4) correspond to the buttons shown when the assistant is active.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Voice Settings Modal */}
      <AIAssistantVoiceSettings
        open={showVoiceSettings}
        onOpenChange={setShowVoiceSettings}
      />
    </>
  );
}
