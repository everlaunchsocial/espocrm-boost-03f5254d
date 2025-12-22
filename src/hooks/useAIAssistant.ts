import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChat } from '@/utils/RealtimeAudio';
import { useUserRole } from '@/hooks/useUserRole';
import { useCurrentAffiliate } from '@/hooks/useCurrentAffiliate';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';

export type AIAssistantState = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking';

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

export function useAIAssistant() {
  const [state, setState] = useState<AIAssistantState>('idle');
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [pageContext, setPageContext] = useState<PageContext | null>(null);
  const [actionHistory, setActionHistory] = useState<ActionHistoryItem[]>([]);

  const chatRef = useRef<RealtimeChat | null>(null);
  const userContextRef = useRef<UserContext | null>(null);
  
  const { role } = useUserRole();
  const { affiliate } = useCurrentAffiliate();
  const location = useLocation();

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

  const handleMessage = useCallback((message: any) => {
    console.log('AI Assistant message:', message.type);
    
    if (message.type === 'response.function_call_arguments.done') {
      setActionInProgress(`Executing: ${message.name}`);
    }
    
    if (message.type === 'response.done') {
      setActionInProgress(null);
    }
  }, []);

  const handleSpeakingChange = useCallback((speaking: boolean) => {
    setState(speaking ? 'speaking' : 'listening');
  }, []);

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    setAiResponse(prev => prev + text);
  }, []);

  const startSession = useCallback(async () => {
    try {
      setState('connecting');
      
      const userRole = role || 'user';
      const affiliateId = affiliate?.id;
      const currentPage = location.pathname;

      console.log('Starting AI assistant session:', { userRole, affiliateId, customerId, currentPage, pageContext });

      const { data, error } = await supabase.functions.invoke('ai-assistant-session', {
        body: {
          userRole,
          affiliateId,
          customerId,
          currentPage,
          pageContext
        }
      });

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

      (chat as any).executeToolCall = async (callId: string, toolName: string, argsString: string) => {
        try {
          console.log(`AI Assistant executing tool: ${toolName}`);
          setActionInProgress(`${toolName.replace(/_/g, ' ')}...`);
          
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
            toast.error(`Failed to ${toolName.replace(/_/g, ' ')}`);
            addActionToHistory(toolName, args, { error: toolError.message }, false);
          } else {
            console.log('Tool result:', result);
            (chat as any).sendToolResult(callId, result.result);
            addActionToHistory(toolName, args, result.result, result.result?.success !== false);
            
            if (result.result?.success) {
              toast.success(result.result.message);
            }
          }
        } catch (error) {
          console.error('Error executing tool:', error);
          (chat as any).sendToolResult(callId, { error: 'Failed to execute action' });
          addActionToHistory(toolName, {}, { error: 'Failed to execute action' }, false);
        } finally {
          setActionInProgress(null);
        }
      };

      await chat.init(data.client_secret.value);
      chatRef.current = chat;
      
      setState('listening');
      setTranscript('');
      setAiResponse('');
      
      toast.success('AI Assistant connected');

    } catch (error) {
      console.error('Failed to start AI assistant session:', error);
      setState('idle');
      toast.error('Failed to connect to AI Assistant');
    }
  }, [role, affiliate, customerId, location.pathname, pageContext, handleMessage, handleSpeakingChange, handleTranscript, addActionToHistory]);

  const endSession = useCallback(() => {
    if (chatRef.current) {
      chatRef.current.disconnect();
      chatRef.current = null;
    }
    setState('idle');
    setTranscript('');
    setAiResponse('');
    setActionInProgress(null);
  }, []);

  const toggleOpen = useCallback(() => {
    if (isOpen) {
      endSession();
      setActionHistory([]);
    }
    setIsOpen(!isOpen);
  }, [isOpen, endSession]);

  const clearActionHistory = useCallback(() => {
    setActionHistory([]);
  }, []);

  useEffect(() => {
    return () => {
      if (chatRef.current) {
        chatRef.current.disconnect();
      }
    };
  }, []);

  return {
    state,
    transcript,
    aiResponse,
    isOpen,
    actionInProgress,
    pageContext,
    actionHistory,
    startSession,
    endSession,
    toggleOpen,
    clearActionHistory
  };
}
