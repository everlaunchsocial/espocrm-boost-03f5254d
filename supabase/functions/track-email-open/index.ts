import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 1x1 transparent PNG pixel
const TRANSPARENT_PIXEL = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

serve(async (req: Request): Promise<Response> => {
  try {
    const url = new URL(req.url);
    const trackingId = url.searchParams.get("id");

    console.log("Email open tracked:", trackingId);

    if (trackingId) {
      // Create Supabase client
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Get current email record
      const { data: currentEmail } = await supabase
        .from("emails")
        .select("*")
        .eq("tracking_id", trackingId)
        .single();

      if (currentEmail) {
        // Update email record with opened status and increment count
        const { error } = await supabase
          .from("emails")
          .update({
            status: "opened",
            opened_at: currentEmail.opened_at || new Date().toISOString(),
            open_count: (currentEmail.open_count || 0) + 1,
          })
          .eq("tracking_id", trackingId);

        if (error) {
          console.error("Error updating email:", error);
        } else {
          console.log("Email marked as opened:", currentEmail.id);
        }
      }
    }

    // Return transparent pixel image
    return new Response(TRANSPARENT_PIXEL, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error: any) {
    console.error("Error in track-email-open:", error);
    // Still return the pixel even on error
    return new Response(TRANSPARENT_PIXEL, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
      },
    });
  }
});
