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
    const { invoiceId } = await req.json();
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: invoice, error: invErr } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
    if (invErr) throw invErr;

    const { data: items } = await supabase.from("invoice_items").select("*").eq("invoice_id", invoiceId).order("sort_order");

    if (!invoice.customer_email) throw new Error("Customer email is required");

    const itemsHtml = (items || []).map((item: any) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${Number(item.unit_price).toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${Number(item.line_total).toFixed(2)}</td>
      </tr>
    `).join("");

    const balanceDue = Number(invoice.total_amount) - Number(invoice.amount_paid);

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981, #3b82f6); padding: 24px; color: white;">
          <h1 style="margin: 0;">Invoice ${invoice.invoice_number}</h1>
        </div>
        <div style="padding: 24px;">
          <p>Dear ${invoice.customer_name},</p>
          <p>Please find your invoice below for: <strong>${invoice.job_title}</strong></p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
            <thead><tr style="background: #f3f4f6;">
              <th style="padding: 12px; text-align: left;">Description</th>
              <th style="padding: 12px; text-align: center;">Qty</th>
              <th style="padding: 12px; text-align: right;">Price</th>
              <th style="padding: 12px; text-align: right;">Total</th>
            </tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          
          <div style="background: #f9fafb; padding: 16px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><span>Total:</span><span>$${Number(invoice.total_amount).toFixed(2)}</span></div>
            ${Number(invoice.amount_paid) > 0 ? `<div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #10b981;"><span>Paid:</span><span>-$${Number(invoice.amount_paid).toFixed(2)}</span></div>` : ""}
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px;"><span>Balance Due:</span><span>$${balanceDue.toFixed(2)}</span></div>
          </div>
          
          ${invoice.due_date ? `<p style="color: #ef4444; margin-top: 16px; font-weight: bold;">Due: ${new Date(invoice.due_date).toLocaleDateString()}</p>` : ""}
        </div>
      </div>
    `;

    await resend.emails.send({
      from: "Invoices <john@localsearch365.com>",
      to: [invoice.customer_email],
      subject: `Invoice ${invoice.invoice_number} - ${invoice.job_title}`,
      html,
    });

    await supabase.from("invoices").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", invoiceId);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
