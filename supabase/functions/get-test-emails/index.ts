import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-test-key',
};

// Valid test keys - must match src/hooks/useTestMode.ts
const VALID_TEST_KEYS = [
  'everlaunch-test-mode-2024',
  'testdriver-ai-2024',
  'automation-test-key',
];

// Extract links from HTML content
function extractLinks(html: string): string[] {
  const linkRegex = /href=["']([^"']+)["']/gi;
  const links: string[] = [];
  let match;
  
  while ((match = linkRegex.exec(html)) !== null) {
    const url = match[1];
    // Filter out mailto, tel, and anchor links
    if (url && !url.startsWith('mailto:') && !url.startsWith('tel:') && !url.startsWith('#')) {
      links.push(url);
    }
  }
  
  return [...new Set(links)]; // Remove duplicates
}

// Categorize links for easier automation use
function categorizeLinks(links: string[]): Record<string, string[]> {
  const categories: Record<string, string[]> = {
    onboarding: [],
    verification: [],
    login: [],
    tracking: [],
    other: [],
  };
  
  for (const link of links) {
    const lowerLink = link.toLowerCase();
    
    if (lowerLink.includes('onboard') || lowerLink.includes('get-started') || lowerLink.includes('portal')) {
      categories.onboarding.push(link);
    } else if (lowerLink.includes('verify') || lowerLink.includes('confirm') || lowerLink.includes('activate')) {
      categories.verification.push(link);
    } else if (lowerLink.includes('login') || lowerLink.includes('signin') || lowerLink.includes('sign-in')) {
      categories.login.push(link);
    } else if (lowerLink.includes('track') || lowerLink.includes('pixel') || lowerLink.includes('open')) {
      categories.tracking.push(link);
    } else {
      categories.other.push(link);
    }
  }
  
  return categories;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate test key
    const testKey = req.headers.get('x-test-key');
    if (!testKey || !VALID_TEST_KEYS.includes(testKey)) {
      console.error('[get-test-emails] Invalid or missing test key');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid test key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const email = url.searchParams.get('email');
    const minutesAgo = parseInt(url.searchParams.get('minutes') || '30');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[get-test-emails] Fetching emails for ${email}, last ${minutesAgo} minutes`);

    // Create Supabase client with service role for full access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Calculate time threshold
    const threshold = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();

    // Query emails table
    const { data: emails, error } = await supabase
      .from('emails')
      .select('id, subject, body, to_email, sender_name, sent_at, tracking_id, status')
      .eq('to_email', email)
      .gte('created_at', threshold)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[get-test-emails] Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch emails', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process emails to extract and categorize links
    const processedEmails = (emails || []).map((email) => {
      const allLinks = extractLinks(email.body || '');
      const categorizedLinks = categorizeLinks(allLinks);
      
      return {
        id: email.id,
        subject: email.subject,
        from: email.sender_name,
        to: email.to_email,
        sentAt: email.sent_at,
        status: email.status,
        trackingId: email.tracking_id,
        bodyHtml: email.body,
        bodyText: email.body?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
        links: {
          all: allLinks,
          categorized: categorizedLinks,
        },
      };
    });

    console.log(`[get-test-emails] Found ${processedEmails.length} emails for ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        email: email,
        count: processedEmails.length,
        timeRange: {
          from: threshold,
          to: new Date().toISOString(),
        },
        emails: processedEmails,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[get-test-emails] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
