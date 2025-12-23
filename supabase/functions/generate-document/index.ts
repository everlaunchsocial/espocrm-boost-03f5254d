import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateDocumentRequest {
  templateId: string;
  leadId?: string;
  customData?: Record<string, string>;
  sendForSignature?: boolean;
  recipientEmail?: string;
  expiresInDays?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { templateId, leadId, customData, sendForSignature, recipientEmail, expiresInDays } = await req.json() as GenerateDocumentRequest;

    console.log('Generating document from template:', templateId, 'for lead:', leadId);

    // Fetch template
    const { data: template, error: templateError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      throw new Error('Template not found');
    }

    // Fetch lead data if provided
    let leadData: Record<string, any> = {};
    if (leadId) {
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (!leadError && lead) {
        leadData = {
          first_name: lead.first_name || '',
          last_name: lead.last_name || '',
          company: lead.company || '',
          email: lead.email || '',
          phone: lead.phone || '',
          industry: lead.industry || '',
          address: lead.address || '',
          city: lead.city || '',
          state: lead.state || '',
          zip_code: lead.zip_code || '',
          website: lead.website || '',
          notes: lead.notes || '',
        };
      }
    }

    // Merge custom data with lead data
    const mergeData = { ...leadData, ...customData };

    // Add common fields
    const today = new Date();
    mergeData.today_date = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    mergeData.start_date = mergeData.start_date || mergeData.today_date;
    mergeData.effective_date = mergeData.effective_date || mergeData.today_date;
    mergeData.proposal_date = mergeData.proposal_date || mergeData.today_date;
    mergeData.quote_date = mergeData.quote_date || mergeData.today_date;
    mergeData.invoice_date = mergeData.invoice_date || mergeData.today_date;
    mergeData.valid_until = mergeData.valid_until || new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    mergeData.due_date = mergeData.due_date || new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Replace merge fields in template content
    let generatedContent = template.content_template;
    for (const [key, value] of Object.entries(mergeData)) {
      const placeholder = `{{${key}}}`;
      generatedContent = generatedContent.split(placeholder).join(String(value || ''));
    }

    // Remove any remaining unfilled placeholders
    generatedContent = generatedContent.replace(/\{\{[^}]+\}\}/g, '___________');

    // Generate document name
    const documentName = `${template.name} - ${mergeData.company || 'Document'} - ${today.toISOString().split('T')[0]}`;

    // Store generated content as a text file (in real implementation, would convert to PDF)
    const fileName = `documents/${Date.now()}-${documentName.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    
    const { error: uploadError } = await supabase.storage
      .from('assets')
      .upload(fileName, new TextEncoder().encode(generatedContent), {
        contentType: 'text/plain',
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Failed to upload document');
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('assets')
      .getPublicUrl(fileName);

    // Calculate expiration
    let expiresAt = null;
    if (expiresInDays) {
      expiresAt = new Date(today.getTime() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();
    }

    // Create document record
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        name: documentName,
        document_type: template.template_type,
        file_url: urlData.publicUrl,
        file_type: 'txt',
        file_size_bytes: new TextEncoder().encode(generatedContent).length,
        related_to_id: leadId || null,
        related_to_type: leadId ? 'lead' : null,
        related_to_name: mergeData.company || null,
        status: sendForSignature ? 'sent' : 'draft',
        sent_to_email: recipientEmail || mergeData.email || null,
        sent_at: sendForSignature ? new Date().toISOString() : null,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (docError) {
      console.error('Document creation error:', docError);
      throw new Error('Failed to create document record');
    }

    // Log activity if lead is associated
    if (leadId) {
      await supabase.from('activities').insert({
        type: 'document',
        subject: `Document generated: ${documentName}`,
        description: sendForSignature 
          ? `Document sent for signature to ${recipientEmail || mergeData.email}`
          : 'Document created as draft',
        related_to_type: 'lead',
        related_to_id: leadId,
        related_to_name: mergeData.company,
        is_system_generated: true,
      });
    }

    console.log('Document generated successfully:', document.id);

    return new Response(
      JSON.stringify({
        success: true,
        document,
        generatedContent,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating document:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
