import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // Get authorization header to identify the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body
    const { userRole, affiliateId, customerId, currentPage, pageContext } = await req.json();

    console.log('AI Assistant session request:', { userRole, affiliateId, customerId, currentPage, pageContext });

    // Fetch user context based on role
    let userContext = '';
    let userName = 'User';

    // Build page context string for system prompt
    let pageContextPrompt = '';
    if (pageContext?.entityType && pageContext?.entityName) {
      const entityTypeLabels: Record<string, string> = {
        lead: 'Lead',
        demo: 'Demo',
        contact: 'Contact'
      };
      pageContextPrompt = `\n📍 CURRENT PAGE CONTEXT:
The user is currently viewing: ${entityTypeLabels[pageContext.entityType] || pageContext.entityType}: "${pageContext.entityName}"
Entity ID: ${pageContext.entityId}
Status: ${pageContext.entityStatus || 'Unknown'}
${pageContext.entityEmail ? `Email: ${pageContext.entityEmail}` : ''}

IMPORTANT: When the user says "this lead", "this demo", "this contact", or similar, they are referring to the entity above.
You can use the entity ID directly in tool calls when the user references "this" entity.
`;
    }

    if (userRole === 'affiliate' && affiliateId) {
      // Fetch affiliate data
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('username, demo_credits_remaining')
        .eq('id', affiliateId)
        .single();

      if (affiliate) {
        userName = affiliate.username;
        userContext += `User is affiliate: ${affiliate.username}\n`;
        userContext += `Demo credits remaining: ${affiliate.demo_credits_remaining || 0}\n`;
      }

      // Fetch recent demos
      const { data: demos } = await supabase
        .from('demos')
        .select('id, business_name, created_at, status')
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (demos && demos.length > 0) {
        userContext += `\nRecent demos:\n`;
        demos.forEach((demo, i) => {
          userContext += `${i + 1}. ${demo.business_name} (${demo.status}) - Created ${new Date(demo.created_at).toLocaleDateString()}\n`;
        });
      }

      // Fetch leads
      const { data: leads } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email, status, created_at')
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (leads && leads.length > 0) {
        userContext += `\nRecent leads:\n`;
        leads.forEach((lead, i) => {
          userContext += `${i + 1}. ${lead.first_name} ${lead.last_name} (${lead.email}) - ${lead.status}\n`;
        });
      }

    } else if (userRole === 'customer' && customerId) {
      // Fetch customer data
      const { data: customer } = await supabase
        .from('customer_profiles')
        .select('business_name, contact_name, minutes_used, minutes_included')
        .eq('id', customerId)
        .single();

      if (customer) {
        userName = customer.contact_name || customer.business_name || 'Customer';
        userContext += `User is customer: ${customer.business_name}\n`;
        userContext += `Contact: ${customer.contact_name}\n`;
        userContext += `Minutes: ${customer.minutes_used}/${customer.minutes_included} used\n`;
      }

      // Fetch customer leads (from their AI receptionist)
      const { data: customerLeads } = await supabase
        .from('customer_leads')
        .select('id, caller_name, caller_phone, status, created_at')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (customerLeads && customerLeads.length > 0) {
        userContext += `\nRecent incoming leads:\n`;
        customerLeads.forEach((lead, i) => {
          userContext += `${i + 1}. ${lead.caller_name || 'Unknown'} (${lead.caller_phone || 'No phone'}) - ${lead.status}\n`;
        });
      }

    } else if (userRole === 'admin' || userRole === 'super_admin') {
      userName = 'Admin';
      userContext += `User is ${userRole}\n`;

      // Fetch CRM leads for admin
      const { data: leads } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email, status, created_at')
        .order('created_at', { ascending: false })
        .limit(30);

      if (leads && leads.length > 0) {
        userContext += `\nRecent CRM leads:\n`;
        leads.forEach((lead, i) => {
          userContext += `${i + 1}. ${lead.first_name} ${lead.last_name} (${lead.email}) - ${lead.status}\n`;
        });
      }

      // Fetch contacts
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, status')
        .order('created_at', { ascending: false })
        .limit(20);

      if (contacts && contacts.length > 0) {
        userContext += `\nRecent contacts:\n`;
        contacts.forEach((contact, i) => {
          userContext += `${i + 1}. ${contact.first_name} ${contact.last_name} (${contact.email}) - ${contact.status}\n`;
        });
      }

      // Fetch tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, status, due_date')
        .order('due_date', { ascending: true })
        .limit(10);

      if (tasks && tasks.length > 0) {
        userContext += `\nUpcoming tasks:\n`;
        tasks.forEach((task, i) => {
          userContext += `${i + 1}. ${task.title} - ${task.status}${task.due_date ? ` (Due: ${new Date(task.due_date).toLocaleDateString()})` : ''}\n`;
        });
      }
    }

    // Build system prompt for internal productivity assistant
    const systemPrompt = `You are an AI productivity assistant for EverLaunch, an AI receptionist platform. You help internal users manage their work efficiently through voice commands.
${pageContextPrompt}
CURRENT USER CONTEXT:
${userContext}

Current page: ${currentPage || 'Unknown'}
Current time: ${new Date().toLocaleString()}

YOUR CAPABILITIES:
- Book demos for businesses (affiliates only)
- Send emails to leads/contacts
- Get upcoming appointments and calendar events
- Query and filter leads by status or name
- Create tasks in the CRM
- Show follow-ups that are due today
- Provide demo performance stats

PERSONALITY:
- Be concise and action-oriented
- Confirm actions before executing them
- Speak naturally but efficiently
- Reference specific data from the context above when relevant
- If you don't have enough information to complete a request, ask for clarification

IMPORTANT RULES:
- Keep responses brief (2-3 sentences max for confirmations)
- Always confirm before sending emails or booking demos
- When searching for leads/contacts, use partial name matching
- For dates, use natural language (today, tomorrow, next week)
- If a requested action fails, explain what happened and suggest alternatives

GREETING:
Start with: "Hey ${userName}, I'm your EverLaunch assistant. What can I help you with?"`;

    // Define tools for internal operations
    const tools = [
      {
        type: "function",
        name: "book_demo",
        description: "Book a new demo for a business. Use this when the user says things like 'book a demo for Jimmy's Pizza' or 'create a demo for this business'.",
        parameters: {
          type: "object",
          properties: {
            business_name: {
              type: "string",
              description: "The name of the business to create a demo for"
            },
            business_email: {
              type: "string",
              description: "The email address of the business contact"
            },
            website_url: {
              type: "string",
              description: "The business website URL (optional)"
            },
            notes: {
              type: "string",
              description: "Any additional notes about the demo"
            }
          },
          required: ["business_name"]
        }
      },
      {
        type: "function",
        name: "send_email",
        description: "Send an email to a lead or contact. Use this when the user says 'send an email to...' or 'email this person'.",
        parameters: {
          type: "object",
          properties: {
            recipient_email: {
              type: "string",
              description: "The email address to send to"
            },
            recipient_name: {
              type: "string",
              description: "The recipient's name"
            },
            subject: {
              type: "string",
              description: "The email subject line"
            },
            content: {
              type: "string",
              description: "The email body content"
            },
            email_type: {
              type: "string",
              enum: ["follow_up", "introduction", "thank_you", "custom"],
              description: "The type of email to send"
            }
          },
          required: ["recipient_email", "subject", "content"]
        }
      },
      {
        type: "function",
        name: "get_appointments",
        description: "Get upcoming appointments and calendar events. Use this when the user asks 'what are my appointments today' or 'what's on my calendar'.",
        parameters: {
          type: "object",
          properties: {
            date_range: {
              type: "string",
              enum: ["today", "tomorrow", "this_week", "next_week"],
              description: "The time range to fetch appointments for"
            }
          },
          required: ["date_range"]
        }
      },
      {
        type: "function",
        name: "get_leads",
        description: "Query leads by status or search by name. Use this when the user asks about leads or wants to find a specific person.",
        parameters: {
          type: "object",
          properties: {
            search_term: {
              type: "string",
              description: "Search term to find leads by name or email"
            },
            status_filter: {
              type: "string",
              enum: ["new", "contacted", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"],
              description: "Filter leads by status"
            },
            limit: {
              type: "number",
              description: "Maximum number of leads to return (default 10)"
            }
          }
        }
      },
      {
        type: "function",
        name: "create_task",
        description: "Create a new task in the CRM. Use this when the user says 'create a task' or 'remind me to...'.",
        parameters: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "The task title"
            },
            description: {
              type: "string",
              description: "Task description or notes"
            },
            due_date: {
              type: "string",
              description: "When the task is due (e.g., 'today', 'tomorrow', '2024-01-15')"
            },
            priority: {
              type: "string",
              enum: ["low", "medium", "high"],
              description: "Task priority"
            },
            related_lead_name: {
              type: "string",
              description: "Name of a lead to associate this task with"
            }
          },
          required: ["title"]
        }
      },
      {
        type: "function",
        name: "get_follow_ups",
        description: "Get follow-ups that are due. Use this when the user asks 'who do I need to follow up with' or 'what follow-ups are due'.",
        parameters: {
          type: "object",
          properties: {
            date_range: {
              type: "string",
              enum: ["overdue", "today", "this_week"],
              description: "Time range for follow-ups"
            }
          },
          required: ["date_range"]
        }
      },
      {
        type: "function",
        name: "get_demo_stats",
        description: "Get demo performance statistics. Use this when the user asks about their demo stats or performance.",
        parameters: {
          type: "object",
          properties: {
            time_period: {
              type: "string",
              enum: ["today", "this_week", "this_month", "all_time"],
              description: "Time period for statistics"
            }
          },
          required: ["time_period"]
        }
      }
    ];

    console.log('Creating realtime session for AI assistant...');

    // Request an ephemeral token from OpenAI
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "alloy",
        instructions: systemPrompt,
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: {
          model: "whisper-1"
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 800
        },
        tools: tools,
        tool_choice: "auto"
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("AI Assistant session created with tools");

    // Return session data with user context for tool handler
    return new Response(JSON.stringify({
      ...data,
      userContext: {
        userRole,
        affiliateId,
        customerId,
        userName
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error creating AI assistant session:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
