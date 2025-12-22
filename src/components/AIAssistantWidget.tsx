import { useState, useMemo } from 'react';
import { Mic, MicOff, X, Loader2, Volume2, Minimize2, Maximize2, MapPin, ChevronDown, ChevronUp, Mail, Calendar, FileText, Phone, CheckCircle, XCircle, Clock, BarChart3, ListTodo, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAIAssistant, AIAssistantState, ActionHistoryItem } from '@/hooks/useAIAssistant';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

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
    aiResponse,
    isOpen,
    actionInProgress,
    pageContext,
    actionHistory,
    startSession,
    endSession,
    toggleOpen,
    sendTextCommand
  } = useAIAssistant();

  const { isEnabled } = useFeatureFlags();
  const { role } = useUserRole();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);
  const [selectedAction, setSelectedAction] = useState<ActionHistoryItem | null>(null);

  // Filter quick actions based on user role
  const filteredQuickActions = useMemo(() => {
    const userRole = role === 'admin' ? 'admin' : role === 'customer' ? 'customer' : 'affiliate';
    return quickActions.filter(action => action.roles.includes(userRole));
  }, [role]);

  const isProcessing = state === 'connecting' || state === 'processing';

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
    <>
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 bg-card border border-border rounded-2xl shadow-2xl",
          "transition-all duration-300 flex flex-col",
          isMinimized ? "w-72 h-16" : "w-80 max-h-[520px]",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
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
          <div className="flex-1 overflow-hidden flex flex-col">
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

            {/* Controls */}
            <div className="p-4 pt-2 border-t border-border flex-shrink-0">
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
          </div>
        )}

        {/* Minimized state */}
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
    </>
  );
}
