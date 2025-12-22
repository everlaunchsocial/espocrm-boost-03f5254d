import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChat } from '@/utils/RealtimeAudio';
import { useUserRole } from '@/hooks/useUserRole';
import { useCurrentAffiliate } from '@/hooks/useCurrentAffiliate';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAIAssistantTracking } from '@/hooks/useAIAssistantTracking';

export type AIAssistantState = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking';
export type ConnectionStatus = 'online' | 'connecting' | 'offline' | 'error';

interface UserContext {
  userRole: string;
  affiliateId?: string;
  customerId?: string;
  userName?: string;
}

interface PageContext {
  route: string;
  entityType?: 'lead' | 'demo' | 'contact' | null;
  entityId?: string | null;
  entityName?: string | null;
  entityStatus?: string | null;
  entityEmail?: string | null;
}

export interface ActionHistoryItem {
  id: string;
  toolName: string;
  summary: string;
  timestamp: Date;
  success: boolean;
  parameters?: Record<string, any>;
  result?: any;
  aiResponse?: string;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  timestamp: Date;
  toolName?: string;
  toolResult?: any;
  errorType?: 'network' | 'session' | 'microphone' | 'tool' | 'timeout' | 'webrtc';
  retryAction?: () => void;
}

export interface SuggestedQuestion {
  id: string;
  text: string;
  icon: string;
  category: 'calendar' | 'email' | 'stats' | 'leads' | 'general';
}

export interface AIError {
  type: 'network' | 'session' | 'microphone' | 'tool' | 'timeout' | 'webrtc';
  message: string;
  details?: string;
  retryAction?: () => void;
}

const MAX_MESSAGES = 100;
const SUGGESTION_CACHE_MS = 60000; // 60 seconds
const SESSION_TIMEOUT_MS = 30000; // 30 seconds
const MAX_RECONNECT_ATTEMPTS = 3;
const MAX_SESSION_RETRIES = 3;

const getCategoryIcon = (category: string): string => {
  switch (category) {
    case 'calendar': return '📅';
    case 'email': return '📧';
    case 'stats': return '📊';
    case 'leads': return '📋';
    default: return '💡';
  }
};

export function useAIAssistant() {
  const [state, setState] = useState<AIAssistantState>('idle');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('online');
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [pageContext, setPageContext] = useState<PageContext | null>(null);
  const [actionHistory, setActionHistory] = useState<ActionHistoryItem[]>([]);
  const [conversationMessages, setConversationMessages] = useState<ConversationMessage[]>([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState<SuggestedQuestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [currentError, setCurrentError] = useState<AIError | null>(null);
  const [isTextInputMode, setIsTextInputMode] = useState(false);
  const [microphonePermission, setMicrophonePermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  const chatRef = useRef<RealtimeChat | null>(null);
  const userContextRef = useRef<UserContext | null>(null);
  const currentAiMessageRef = useRef<string>('');
  const suggestionsCacheRef = useRef<{ questions: SuggestedQuestion[]; timestamp: number } | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const sessionRetryCountRef = useRef(0);
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const { role } = useUserRole();
  const { affiliate } = useCurrentAffiliate();
  const location = useLocation();
  const { 
    startSessionTracking, 
    endSessionTracking, 
    trackActionStart, 
    trackAction 
  } = useAIAssistantTracking();
  
  const actionsCountRef = useRef(0);
  const errorsCountRef = useRef(0);

  // Network status detection
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network status: online');
      setConnectionStatus('online');
      setCurrentError(null);
    };
    
    const handleOffline = () => {
      console.log('Network status: offline');
      setConnectionStatus('offline');
      setCurrentError({
        type: 'network',
        message: "You're offline. Voice assistant unavailable."
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check microphone permission
  useEffect(() => {
    const checkMicPermission = async () => {
      try {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setMicrophonePermission(permission.state as 'granted' | 'denied' | 'prompt');
        
        permission.addEventListener('change', () => {
          setMicrophonePermission(permission.state as 'granted' | 'denied' | 'prompt');
        });
      } catch {
        // Browser doesn't support permission query, assume prompt
        setMicrophonePermission('prompt');
      }
    };
    checkMicPermission();
  }, []);

  // Get customer ID for customer users
  const [customerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomerId = async () => {
      if (role === 'customer') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: customer } = await supabase
            .from('customer_profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();
          if (customer) {
            setCustomerId(customer.id);
          }
        }
      }
    };
    fetchCustomerId();
  }, [role]);

  // Detect page context from URL and fetch entity data
  useEffect(() => {
    const detectPageContext = async () => {
      const path = location.pathname;
      let context: PageContext = { route: path };

      // Pattern matching for different routes
      const leadDetailMatch = path.match(/\/leads\/([a-f0-9-]{36})/i);
      const demoDetailMatch = path.match(/\/demos\/([a-f0-9-]{36})/i);
      const contactDetailMatch = path.match(/\/contacts\/([a-f0-9-]{36})/i);

      if (leadDetailMatch) {
        const leadId = leadDetailMatch[1];
        context.entityType = 'lead';
        context.entityId = leadId;

        const { data: lead } = await supabase
          .from('leads')
          .select('first_name, last_name, email, pipeline_status, status')
          .eq('id', leadId)
          .single();

        if (lead) {
          context.entityName = `${lead.first_name} ${lead.last_name}`.trim();
          context.entityStatus = lead.pipeline_status || lead.status;
          context.entityEmail = lead.email;
        }
      } else if (demoDetailMatch) {
        const demoId = demoDetailMatch[1];
        context.entityType = 'demo';
        context.entityId = demoId;

        const { data: demo } = await supabase
          .from('demos')
          .select('business_name, status, website_url')
          .eq('id', demoId)
          .single();

        if (demo) {
          context.entityName = demo.business_name;
          context.entityStatus = demo.status;
        }
      } else if (contactDetailMatch) {
        const contactId = contactDetailMatch[1];
        context.entityType = 'contact';
        context.entityId = contactId;

        const { data: contact } = await supabase
          .from('contacts')
          .select('first_name, last_name, email, status')
          .eq('id', contactId)
          .single();

        if (contact) {
          context.entityName = `${contact.first_name} ${contact.last_name}`.trim();
          context.entityStatus = contact.status;
          context.entityEmail = contact.email;
        }
      }

      setPageContext(context);
    };

    detectPageContext();
  }, [location.pathname]);

  const addActionToHistory = useCallback((
    toolName: string,
    parameters: Record<string, any>,
    result: any,
    success: boolean
  ) => {
    const summaryMap: Record<string, (params: any, result: any) => string> = {
      book_demo: (p) => `Booked demo for ${p.business_name || 'business'}`,
      send_email: (p) => `Sent email to ${p.recipient_name || p.recipient_email || 'contact'}`,
      get_appointments: (p) => `Checked ${p.date_range || 'upcoming'} appointments`,
      get_leads: (p) => p.search_term ? `Searched leads: "${p.search_term}"` : 'Listed leads',
      create_task: (p) => `Created task: ${p.title || 'New task'}`,
      get_follow_ups: (p) => `Checked ${p.date_range || 'due'} follow-ups`,
      get_demo_stats: (p) => `Got ${p.time_period || 'recent'} demo stats`,
    };

    const summary = summaryMap[toolName]?.(parameters, result) || `Executed ${toolName.replace(/_/g, ' ')}`;

    const newAction: ActionHistoryItem = {
      id: crypto.randomUUID(),
      toolName,
      summary,
      timestamp: new Date(),
      success,
      parameters,
      result,
    };

    setActionHistory(prev => [newAction, ...prev].slice(0, 10));
  }, []);

  // Get default suggestions based on role and time of day
  const getDefaultSuggestions = useCallback((): SuggestedQuestion[] => {
    const hour = new Date().getHours();
    const userRole = role === 'admin' ? 'admin' : role === 'customer' ? 'customer' : 'affiliate';
    
    const baseSuggestions: SuggestedQuestion[] = [];
    
    // Time-based suggestions
    if (hour < 12) {
      baseSuggestions.push({
        id: 'morning-calendar',
        text: "What's on my calendar today?",
        icon: '📅',
        category: 'calendar'
      });
    } else {
      baseSuggestions.push({
        id: 'afternoon-urgent',
        text: 'Any urgent follow-ups?',
        icon: '⚡',
        category: 'leads'
      });
    }
    
    // Role-based suggestions
    if (userRole === 'affiliate' || userRole === 'admin') {
      baseSuggestions.push(
        { id: 'demos', text: 'Show my recent demos', icon: '📊', category: 'stats' },
        { id: 'followups', text: 'Who needs follow-up?', icon: '📋', category: 'leads' }
      );
    }
    
    if (userRole === 'customer') {
      baseSuggestions.push(
        { id: 'usage', text: "What's my usage this month?", icon: '📊', category: 'stats' },
        { id: 'support', text: 'How do I get support?', icon: '❓', category: 'general' }
      );
    }
    
    if (userRole === 'admin') {
      baseSuggestions.push(
        { id: 'team', text: "How's the team doing?", icon: '👥', category: 'stats' }
      );
    }
    
    return baseSuggestions.slice(0, 4);
  }, [role]);

  // Generate contextual suggestions based on conversation
  const generateSuggestions = useCallback(async () => {
    // Check cache first
    if (suggestionsCacheRef.current && 
        Date.now() - suggestionsCacheRef.current.timestamp < SUGGESTION_CACHE_MS) {
      return;
    }
    
    // If no conversation yet, use defaults
    if (conversationMessages.length === 0) {
      const defaults = getDefaultSuggestions();
      setSuggestedQuestions(defaults);
      return;
    }
    
    setSuggestionsLoading(true);
    
    try {
      // Get last 3 messages for context
      const recentContext = conversationMessages
        .slice(-3)
        .map(m => `${m.role}: ${m.content}`)
        .join('\n');
      
      const contextInfo = pageContext?.entityType 
        ? `User is viewing: ${pageContext.entityType} "${pageContext.entityName}"`
        : '';
      
      const hour = new Date().getHours();
      const timeContext = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      
      const { data, error } = await supabase.functions.invoke('ai-assistant-suggestions', {
        body: {
          recentContext,
          pageContext: contextInfo,
          timeContext,
          userRole: role || 'user'
        }
      });
      
      if (error) throw error;
      
      if (data?.suggestions && Array.isArray(data.suggestions)) {
        const suggestions: SuggestedQuestion[] = data.suggestions.slice(0, 4).map((s: any, i: number) => ({
          id: `suggestion-${i}`,
          text: s.text || s,
          icon: s.icon || getCategoryIcon(s.category || 'general'),
          category: s.category || 'general'
        }));
        
        setSuggestedQuestions(suggestions);
        suggestionsCacheRef.current = { questions: suggestions, timestamp: Date.now() };
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
      // Fall back to defaults on error
      const defaults = getDefaultSuggestions();
      setSuggestedQuestions(defaults);
    } finally {
      setSuggestionsLoading(false);
    }
  }, [conversationMessages, pageContext, role, getDefaultSuggestions]);

  const addConversationMessage = useCallback((
    role: 'user' | 'assistant' | 'error',
    content: string,
    toolName?: string,
    toolResult?: any,
    errorType?: 'network' | 'session' | 'microphone' | 'tool' | 'timeout' | 'webrtc',
    retryAction?: () => void
  ) => {
    const newMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: new Date(),
      toolName,
      toolResult,
      errorType,
      retryAction,
    };
    setConversationMessages(prev => [...prev, newMessage].slice(-MAX_MESSAGES));
  }, []);

  // Log error for telemetry
  const logError = useCallback((
    errorType: string,
    errorMessage: string,
    details?: Record<string, any>
  ) => {
    const sessionId = chatRef.current ? 'active' : 'none';
    
    // Log to console (always)
    console.error('AI Assistant Error:', {
      type: errorType,
      message: errorMessage,
      details,
      sessionId,
      userRole: role,
      pageRoute: location.pathname,
      timestamp: new Date().toISOString()
    });
  }, [role, location.pathname]);

  // Handle WebRTC reconnection
  const attemptReconnect = useCallback(async () => {
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setCurrentError({
        type: 'webrtc',
        message: 'Connection lost. Please restart the session.',
        retryAction: () => {
          reconnectAttemptsRef.current = 0;
          startSession();
        }
      });
      addConversationMessage(
        'error',
        '❌ Connection lost after multiple attempts',
        undefined,
        undefined,
        'webrtc'
      );
      setState('idle');
      return;
    }

    reconnectAttemptsRef.current++;
    setConnectionStatus('connecting');
    toast.info(`Reconnecting... (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
    
    // Exponential backoff
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 5000);
    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      await startSession();
      reconnectAttemptsRef.current = 0;
      setConnectionStatus('online');
    } catch {
      attemptReconnect();
    }
  }, [addConversationMessage]);

  const handleMessage = useCallback((message: any) => {
    console.log('AI Assistant message:', message.type);
    
    if (message.type === 'response.function_call_arguments.done') {
      setActionInProgress(`Executing: ${message.name}`);
    }
    
    if (message.type === 'response.done') {
      setActionInProgress(null);
      // Save the complete AI response as a conversation message
      if (currentAiMessageRef.current.trim()) {
        addConversationMessage('assistant', currentAiMessageRef.current.trim());
        currentAiMessageRef.current = '';
      }
    }

    // Capture user transcript
    if (message.type === 'conversation.item.input_audio_transcription.completed' && message.transcript) {
      addConversationMessage('user', message.transcript);
    }
  }, [addConversationMessage]);

  const handleSpeakingChange = useCallback((speaking: boolean) => {
    setState(speaking ? 'speaking' : 'listening');
  }, []);

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    currentAiMessageRef.current += text;
    setAiResponse(prev => prev + text);
  }, []);

  const startSession = useCallback(async () => {
    // Check network first
    if (!navigator.onLine) {
      setCurrentError({
        type: 'network',
        message: "You're offline. Voice assistant unavailable."
      });
      toast.error("You're offline. Please check your connection.");
      return;
    }

    // Check microphone permission
    if (microphonePermission === 'denied') {
      setCurrentError({
        type: 'microphone',
        message: 'Microphone access denied. Enable in browser settings.'
      });
      addConversationMessage(
        'error',
        '🎤 Microphone access denied. Enable in browser settings or use text input.',
        undefined,
        undefined,
        'microphone'
      );
      setIsTextInputMode(true);
      return;
    }

    try {
      setState('connecting');
      setConnectionStatus('connecting');
      setCurrentError(null);
      
      // Start session timeout
      sessionTimeoutRef.current = setTimeout(() => {
        if (state === 'connecting') {
          logError('timeout', 'Session creation timed out');
          setCurrentError({
            type: 'timeout',
            message: 'AI is unresponsive. Please try again.',
            retryAction: () => startSession()
          });
          addConversationMessage(
            'error',
            '⏱️ Connection timed out. Try again?',
            undefined,
            undefined,
            'timeout',
            () => startSession()
          );
          setState('idle');
          setConnectionStatus('error');
        }
      }, SESSION_TIMEOUT_MS);
      
      const userRole = role || 'user';
      const affiliateId = affiliate?.id;
      const currentPage = location.pathname;

      // Fetch voice settings
      let voiceSettings = { voice: 'alloy', voiceSensitivity: 'medium' };
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prefs } = await supabase
          .from('user_preferences')
          .select('ai_assistant_voice, ai_voice_sensitivity')
          .eq('user_id', user.id)
          .single();
        
        if (prefs) {
          voiceSettings = {
            voice: prefs.ai_assistant_voice || 'alloy',
            voiceSensitivity: prefs.ai_voice_sensitivity || 'medium'
          };
        }
      }

      console.log('Starting AI assistant session:', { userRole, affiliateId, customerId, currentPage, pageContext, voiceSettings });

      const { data, error } = await supabase.functions.invoke('ai-assistant-session', {
        body: {
          userRole,
          affiliateId,
          customerId,
          currentPage,
          pageContext,
          voiceSettings
        }
      });

      // Clear timeout on response
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
        sessionTimeoutRef.current = null;
      }

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.client_secret?.value) {
        throw new Error('No ephemeral key received');
      }

      userContextRef.current = data.userContext;

      const chat = new RealtimeChat(
        handleMessage,
        handleSpeakingChange,
        handleTranscript
      );

      // Handle WebRTC connection errors
      (chat as any).onConnectionError = (err: any) => {
        console.error('WebRTC connection error:', err);
        logError('webrtc', 'WebRTC connection error', { error: err.message });
        attemptReconnect();
      };

      (chat as any).executeToolCall = async (callId: string, toolName: string, argsString: string) => {
        try {
          console.log(`AI Assistant executing tool: ${toolName}`);
          setActionInProgress(`${toolName.replace(/_/g, ' ')}...`);
          lastActivityRef.current = Date.now();
          trackActionStart();
          
          let args: Record<string, any>;
          try {
            args = JSON.parse(argsString);
          } catch {
            args = {};
          }

          const { data: result, error: toolError } = await supabase.functions.invoke('ai-assistant-tool-handler', {
            body: {
              tool_name: toolName,
              arguments: args,
              userContext: userContextRef.current,
              pageContext
            }
          });

          if (toolError) {
            console.error('Tool execution error:', toolError);
            (chat as any).sendToolResult(callId, { error: toolError.message });
            
            // Add error to transcript
            addConversationMessage(
              'error',
              `❌ Failed to ${toolName.replace(/_/g, ' ')}: ${toolError.message}`,
              toolName,
              undefined,
              'tool'
            );
            
            logError('tool', `Tool ${toolName} failed`, { error: toolError.message, args });
            toast.error(`Failed to ${toolName.replace(/_/g, ' ')}`);
            addActionToHistory(toolName, args, { error: toolError.message }, false);
            
            // Track failed action
            errorsCountRef.current++;
            actionsCountRef.current++;
            trackAction(toolName, args, false, toolError.message);
          } else {
            console.log('Tool result:', result);
            (chat as any).sendToolResult(callId, result.result);
            addActionToHistory(toolName, args, result.result, result.result?.success !== false);
            
            // Track successful action
            actionsCountRef.current++;
            trackAction(toolName, args, result.result?.success !== false);
            
            if (result.result?.success) {
              toast.success(result.result.message);
            }
          }
        } catch (error) {
          console.error('Error executing tool:', error);
          (chat as any).sendToolResult(callId, { error: 'Failed to execute action' });
          
          addConversationMessage(
            'error',
            `❌ Failed to execute: ${toolName.replace(/_/g, ' ')}`,
            toolName,
            undefined,
            'tool'
          );
          
          logError('tool', `Tool ${toolName} crashed`, { error: String(error) });
          addActionToHistory(toolName, {}, { error: 'Failed to execute action' }, false);
          
          // Track crashed action
          errorsCountRef.current++;
          actionsCountRef.current++;
          trackAction(toolName, {}, false, String(error));
        } finally {
          setActionInProgress(null);
        }
      };

      await chat.init(data.client_secret.value);
      chatRef.current = chat;
      
      setState('listening');
      setConnectionStatus('online');
      setTranscript('');
      setAiResponse('');
      sessionRetryCountRef.current = 0;
      actionsCountRef.current = 0;
      errorsCountRef.current = 0;
      
      // Start analytics tracking
      startSessionTracking(userRole, currentPage, voiceSettings);
      
      toast.success('AI Assistant connected');

    } catch (error) {
      console.error('Failed to start AI assistant session:', error);
      
      // Clear timeout
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
        sessionTimeoutRef.current = null;
      }
      
      sessionRetryCountRef.current++;
      logError('session', 'Failed to start session', { error: String(error), retryCount: sessionRetryCountRef.current });
      
      if (sessionRetryCountRef.current >= MAX_SESSION_RETRIES) {
        // Fallback to text-only mode
        setIsTextInputMode(true);
        setCurrentError({
          type: 'session',
          message: "Voice failed. Switched to text mode.",
          retryAction: () => {
            sessionRetryCountRef.current = 0;
            setIsTextInputMode(false);
            startSession();
          }
        });
        addConversationMessage(
          'error',
          "🔇 Voice connection failed after 3 attempts. Using text input mode.",
          undefined,
          undefined,
          'session',
          () => {
            sessionRetryCountRef.current = 0;
            setIsTextInputMode(false);
            startSession();
          }
        );
        toast.error('Switched to text-only mode');
      } else {
        // Retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, sessionRetryCountRef.current - 1), 5000);
        toast.info(`Retrying in ${delay/1000}s...`);
        
        setTimeout(() => {
          startSession();
        }, delay);
      }
      
      setState('idle');
      setConnectionStatus('error');
    }
  }, [role, affiliate, customerId, location.pathname, pageContext, handleMessage, handleSpeakingChange, handleTranscript, addActionToHistory, microphonePermission, logError, addConversationMessage, attemptReconnect, state]);

  const sendTextCommand = useCallback(async (command: string, actionLabel?: string) => {
    if (!chatRef.current || state === 'idle') {
      toast.info('Start the assistant first');
      return false;
    }
    
    try {
      setState('processing');
      setAiResponse('');
      
      // Add user message to conversation
      addConversationMessage('user', command);
      
      // Send message to the chat
      chatRef.current.sendTextMessage(command);
      
      // Add to history as quick action
      if (actionLabel) {
        const newAction: ActionHistoryItem = {
          id: crypto.randomUUID(),
          toolName: 'quick_action',
          summary: `Quick Action: ${actionLabel}`,
          timestamp: new Date(),
          success: true,
          parameters: { command },
        };
        setActionHistory(prev => [newAction, ...prev].slice(0, 10));
      }
      
      return true;
    } catch (error) {
      console.error('Error sending text command:', error);
      toast.error('Failed to send command');
      return false;
    }
  }, [state, addConversationMessage]);

  const endSession = useCallback(() => {
    // End analytics tracking before cleanup
    endSessionTracking(actionsCountRef.current, errorsCountRef.current);
    
    if (chatRef.current) {
      chatRef.current.disconnect();
      chatRef.current = null;
    }
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }
    setState('idle');
    setTranscript('');
    setAiResponse('');
    setActionInProgress(null);
    setCurrentError(null);
    currentAiMessageRef.current = '';
    reconnectAttemptsRef.current = 0;
    sessionRetryCountRef.current = 0;
    actionsCountRef.current = 0;
    errorsCountRef.current = 0;
    setConnectionStatus('online');
    toast.success('Session ended');
  }, [endSessionTracking]);

  const closeWidget = useCallback(() => {
    if (chatRef.current) {
      endSessionTracking(actionsCountRef.current, errorsCountRef.current);
      chatRef.current.disconnect();
      chatRef.current = null;
    }
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }
    setState('idle');
    setActionHistory([]);
    setConversationMessages([]);
    setSuggestedQuestions([]);
    suggestionsCacheRef.current = null;
    setIsTextInputMode(false);
    setCurrentError(null);
    setTranscript('');
    setAiResponse('');
    setActionInProgress(null);
    currentAiMessageRef.current = '';
    reconnectAttemptsRef.current = 0;
    sessionRetryCountRef.current = 0;
    actionsCountRef.current = 0;
    errorsCountRef.current = 0;
    setConnectionStatus('online');
    setIsOpen(false);
  }, [endSessionTracking]);

  const toggleOpen = useCallback(() => {
    if (isOpen) {
      closeWidget();
    } else {
      setIsOpen(true);
    }
  }, [isOpen, closeWidget]);

  const clearActionHistory = useCallback(() => {
    setActionHistory([]);
  }, []);

  const clearConversation = useCallback(() => {
    setConversationMessages([]);
  }, []);

  const clearError = useCallback(() => {
    setCurrentError(null);
  }, []);

  const retrySession = useCallback(() => {
    sessionRetryCountRef.current = 0;
    reconnectAttemptsRef.current = 0;
    setIsTextInputMode(false);
    setCurrentError(null);
    startSession();
  }, [startSession]);

  // Generate suggestions when conversation changes
  useEffect(() => {
    if (isOpen && state !== 'idle') {
      generateSuggestions();
    }
  }, [isOpen, state, conversationMessages.length, generateSuggestions]);

  // Set defaults when widget opens
  useEffect(() => {
    if (isOpen && suggestedQuestions.length === 0) {
      const defaults = getDefaultSuggestions();
      setSuggestedQuestions(defaults);
    }
  }, [isOpen, getDefaultSuggestions, suggestedQuestions.length]);

  useEffect(() => {
    return () => {
      if (chatRef.current) {
        chatRef.current.disconnect();
      }
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }
    };
  }, []);

  return {
    state,
    connectionStatus,
    transcript,
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
    clearActionHistory,
    clearConversation,
    sendTextCommand,
    generateSuggestions,
    clearError,
    retrySession
  };
}
