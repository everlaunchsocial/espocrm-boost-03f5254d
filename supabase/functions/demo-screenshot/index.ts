import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating screenshot for URL:', url);

    // Normalize URL
    let normalizedUrl = url;
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    // Use thum.io for screenshot generation (free tier available)
    // Format: https://image.thum.io/get/width/WIDTHVALUE/crop/HEIGHTVALUE/URL
    // Important: thum.io expects the URL WITHOUT encoding - just append it directly
    const screenshotUrl = `https://image.thum.io/get/width/800/crop/600/${normalizedUrl}`;

    console.log('Screenshot URL generated:', screenshotUrl);

    // Verify the URL is accessible by making a HEAD request
    try {
      const verifyResponse = await fetch(screenshotUrl, { method: 'HEAD' });
      if (!verifyResponse.ok) {
        console.log('Screenshot service returned non-ok status, but URL may still work');
      }
    } catch (verifyError) {
      console.log('Could not verify screenshot URL, proceeding anyway:', verifyError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        screenshot_url: screenshotUrl 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error generating screenshot:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate screenshot',
        details: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
