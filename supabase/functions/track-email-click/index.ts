import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request): Promise<Response> => {
  try {
    const url = new URL(req.url);
    const linkId = url.searchParams.get("id");
    const targetUrl = url.searchParams.get("url");
    const userAgent = req.headers.get("user-agent") || null;
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                      req.headers.get("cf-connecting-ip") || null;

    console.log("Email click tracked:", { linkId, targetUrl });

    if (!targetUrl) {
      return new Response("Missing target URL", { status: 400 });
    }

    // Decode the target URL
    const decodedUrl = decodeURIComponent(targetUrl);

    if (linkId) {
      // Create Supabase client
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Get email record by tracking_id
      const { data: email } = await supabase
        .from("emails")
        .select("id, lead_id")
        .eq("tracking_id", linkId)
        .single();

      if (email) {
        // Log click event
        const { error: eventError } = await supabase
          .from("email_events")
          .insert({
            email_id: email.id,
            lead_id: email.lead_id,
            event_type: "click",
            url: decodedUrl,
            user_agent: userAgent,
            ip_address: ipAddress,
          });

        if (eventError) {
          console.error("Error logging click event:", eventError);
        } else {
          console.log("Email click event logged for email:", email.id);
        }
      }
    }

    // Redirect to the target URL
    return new Response(null, {
      status: 302,
      headers: {
        "Location": decodedUrl,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("Error in track-email-click:", error);
    // On error, try to redirect anyway
    const url = new URL(req.url);
    const targetUrl = url.searchParams.get("url");
    if (targetUrl) {
      return new Response(null, {
        status: 302,
        headers: { "Location": decodeURIComponent(targetUrl) },
      });
    }
    return new Response("Error processing click", { status: 500 });
  }
});