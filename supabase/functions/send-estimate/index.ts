import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { estimateId } = await req.json();
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: estimate, error: estErr } = await supabase
      .from("estimates")
      .select("*")
      .eq("id", estimateId)
      .single();
    if (estErr) throw estErr;

    const { data: items } = await supabase
      .from("estimate_items")
      .select("*")
      .eq("estimate_id", estimateId)
      .order("sort_order");

    if (!estimate.customer_email) {
      throw new Error("Customer email is required");
    }

    const itemsHtml = (items || []).map((item: any) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${Number(item.unit_price).toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${Number(item.line_total).toFixed(2)}</td>
      </tr>
    `).join("");

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 24px; color: white;">
          <h1 style="margin: 0;">Estimate ${estimate.estimate_number}</h1>
        </div>
        <div style="padding: 24px;">
          <p>Dear ${estimate.customer_name},</p>
          <p>Please find your estimate below for: <strong>${estimate.job_title}</strong></p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 12px; text-align: left;">Description</th>
                <th style="padding: 12px; text-align: center;">Qty</th>
                <th style="padding: 12px; text-align: right;">Price</th>
                <th style="padding: 12px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          
          <div style="background: #f9fafb; padding: 16px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>Subtotal:</span><span>$${Number(estimate.subtotal).toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>Tax (${estimate.tax_rate}%):</span><span>$${Number(estimate.tax_amount).toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px;">
              <span>Total:</span><span>$${Number(estimate.total_amount).toFixed(2)}</span>
            </div>
          </div>
          
          ${estimate.valid_until ? `<p style="color: #6b7280; margin-top: 16px;">Valid until: ${new Date(estimate.valid_until).toLocaleDateString()}</p>` : ""}
          ${estimate.notes ? `<p style="margin-top: 16px;">${estimate.notes}</p>` : ""}
        </div>
      </div>
    `;

    await resend.emails.send({
      from: "Estimates <john@localsearch365.com>",
      to: [estimate.customer_email],
      subject: `Estimate ${estimate.estimate_number} - ${estimate.job_title}`,
      html,
    });

    await supabase.from("estimates").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", estimateId);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
