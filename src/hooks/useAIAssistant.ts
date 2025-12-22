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

export function useAIAssistant() {
  const [state, setState] = useState<AIAssistantState>('idle');
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

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

  const handleMessage = useCallback((message: any) => {
    console.log('AI Assistant message:', message.type);
    
    // Handle tool calls
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
    if (isFinal) {
      setAiResponse(prev => prev + text);
    } else {
      setAiResponse(prev => prev + text);
    }
  }, []);

  const startSession = useCallback(async () => {
    try {
      setState('connecting');
      
      const userRole = role || 'user';
      const affiliateId = affiliate?.id;
      const currentPage = location.pathname;

      console.log('Starting AI assistant session:', { userRole, affiliateId, customerId, currentPage });

      // Get ephemeral token from edge function
      const { data, error } = await supabase.functions.invoke('ai-assistant-session', {
        body: {
          userRole,
          affiliateId,
          customerId,
          currentPage
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.client_secret?.value) {
        throw new Error('No ephemeral key received');
      }

      // Store user context for tool handler
      userContextRef.current = data.userContext;

      // Initialize RealtimeChat with tool handler
      const chat = new RealtimeChat(
        handleMessage,
        handleSpeakingChange,
        handleTranscript
      );

      // Override tool execution to use our AI assistant tool handler
      const originalExecuteTool = (chat as any).executeToolCall.bind(chat);
      (chat as any).executeToolCall = async (callId: string, toolName: string, argsString: string) => {
        try {
          console.log(`AI Assistant executing tool: ${toolName}`);
          setActionInProgress(`${toolName.replace('_', ' ')}...`);
          
          let args: any;
          try {
            args = JSON.parse(argsString);
          } catch {
            args = {};
          }

          // Call our AI assistant tool handler
          const { data: result, error: toolError } = await supabase.functions.invoke('ai-assistant-tool-handler', {
            body: {
              tool_name: toolName,
              arguments: args,
              userContext: userContextRef.current
            }
          });

          if (toolError) {
            console.error('Tool execution error:', toolError);
            (chat as any).sendToolResult(callId, { error: toolError.message });
            toast.error(`Failed to ${toolName.replace('_', ' ')}`);
          } else {
            console.log('Tool result:', result);
            (chat as any).sendToolResult(callId, result.result);
            
            // Show success toast for actions
            if (result.result?.success) {
              toast.success(result.result.message);
            }
          }
        } catch (error) {
          console.error('Error executing tool:', error);
          (chat as any).sendToolResult(callId, { error: 'Failed to execute action' });
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
  }, [role, affiliate, customerId, location.pathname, handleMessage, handleSpeakingChange, handleTranscript]);

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
    }
    setIsOpen(!isOpen);
  }, [isOpen, endSession]);

  // Cleanup on unmount
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
    startSession,
    endSession,
    toggleOpen
  };
}
