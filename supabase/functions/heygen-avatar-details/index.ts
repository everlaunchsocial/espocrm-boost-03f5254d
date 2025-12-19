import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const HEYGEN_API_KEY = Deno.env.get("HEYGEN_API_KEY");
    if (!HEYGEN_API_KEY) {
      throw new Error("HEYGEN_API_KEY missing");
    }

    const { avatar_id } = await req.json();
    if (!avatar_id) {
      throw new Error("avatar_id required");
    }

    console.log(`Fetching HeyGen avatar details for: ${avatar_id}`);

    const response = await fetch(`https://api.heygen.com/v2/avatar/${avatar_id}/details`, {
      method: "GET",
      headers: { "X-Api-Key": HEYGEN_API_KEY },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`HeyGen API error: ${response.status} - ${text}`);
      throw new Error(`HeyGen ${response.status}: ${text}`);
    }

    const json = await response.json();
    console.log(`HeyGen response:`, JSON.stringify(json, null, 2));

    // preview_image_url is part of the avatar detail response schema
    const preview = json?.data?.preview_image_url ?? null;

    return new Response(
      JSON.stringify({ 
        success: true, 
        preview_image_url: preview,
        avatar_name: json?.data?.avatar_name,
        raw: json?.data 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error("Error fetching avatar details:", errorMessage);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
