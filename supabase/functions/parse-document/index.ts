import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { knowledge_source_id } = await req.json();

    if (!knowledge_source_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'knowledge_source_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Parsing document for knowledge source: ${knowledge_source_id}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the knowledge source record
    const { data: source, error: sourceError } = await supabase
      .from('customer_knowledge_sources')
      .select('*')
      .eq('id', knowledge_source_id)
      .single();

    if (sourceError || !source) {
      console.error('Knowledge source not found:', sourceError);
      return new Response(
        JSON.stringify({ success: false, error: 'Knowledge source not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const storagePath = source.storage_path;
    const fileName = source.file_name || '';
    
    if (!storagePath) {
      console.error('No storage path for knowledge source');
      return new Response(
        JSON.stringify({ success: false, error: 'No file path found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Downloading file from storage: ${storagePath}`);

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('customer-documents')
      .download(storagePath);

    if (downloadError || !fileData) {
      console.error('Failed to download file:', downloadError);
      // Update status to failed
      await supabase
        .from('customer_knowledge_sources')
        .update({ status: 'failed' })
        .eq('id', knowledge_source_id);
      
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to download file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`File downloaded successfully, size: ${fileData.size} bytes`);

    let extractedText = '';
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';

    console.log(`Processing file with extension: ${fileExtension}`);

    try {
      if (fileExtension === 'txt') {
        // Plain text - just read directly
        extractedText = await fileData.text();
        console.log(`Extracted ${extractedText.length} chars from TXT file`);
      } else if (fileExtension === 'pdf') {
        // Use Lovable AI (Gemini) for PDF text extraction via vision
        if (!LOVABLE_API_KEY) {
          console.error('LOVABLE_API_KEY not configured for PDF extraction');
          extractedText = '';
        } else {
          console.log('Using Lovable AI (Gemini) for PDF text extraction...');
          
          // Convert PDF to base64
          const arrayBuffer = await fileData.arrayBuffer();
          const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          
          const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: 'Extract ALL text content from this PDF document. Return ONLY the extracted text, preserving the structure and formatting as much as possible. Do not add any commentary or explanations - just return the raw text content from the document.'
                    },
                    {
                      type: 'image_url',
                      image_url: {
                        url: `data:application/pdf;base64,${base64Data}`
                      }
                    }
                  ]
                }
              ]
            }),
          });

          if (response.ok) {
            const data = await response.json();
            extractedText = data.choices?.[0]?.message?.content || '';
            console.log(`Lovable AI extracted ${extractedText.length} chars from PDF`);
          } else {
            const errorText = await response.text();
            console.error('Lovable AI PDF extraction failed:', response.status, errorText);
            
            // Fallback to basic text extraction for text-based PDFs
            console.log('Falling back to basic PDF text extraction...');
            const decoder = new TextDecoder('utf-8', { fatal: false });
            const content = decoder.decode(new Uint8Array(arrayBuffer));
            
            // Extract text objects from PDF
            const textMatches = content.match(/\((.*?)\)/g);
            if (textMatches) {
              extractedText = textMatches
                .map(m => m.slice(1, -1))
                .filter(t => t.length > 1 && /[a-zA-Z]/.test(t))
                .join(' ');
            }
            
            if (!extractedText || extractedText.length < 50) {
              const readablePattern = /[A-Za-z0-9\s,.!?;:'"-]{20,}/g;
              const matches = content.match(readablePattern) || [];
              extractedText = matches.join(' ').trim();
            }
          }
        }
      } else if (fileExtension === 'docx') {
        // For DOCX, extract XML content
        const arrayBuffer = await fileData.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const decoder = new TextDecoder('utf-8', { fatal: false });
        const content = decoder.decode(bytes);
        
        // Extract text from w:t tags (Word text elements)
        const textMatches = content.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
        if (textMatches) {
          extractedText = textMatches
            .map(m => m.replace(/<[^>]+>/g, ''))
            .join(' ');
        }
        
        console.log(`Extracted ${extractedText.length} chars from DOCX file`);
      } else {
        // Unsupported format - try to read as text
        try {
          extractedText = await fileData.text();
        } catch {
          extractedText = '';
        }
        console.log(`Attempted text extraction from unknown format: ${extractedText.length} chars`);
      }
    } catch (parseError) {
      console.error('Error parsing document:', parseError);
      extractedText = '';
    }

    // Clean up the extracted text
    extractedText = extractedText
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\x20-\x7E\n\u00A0-\u024F]/g, '') // Keep printable ASCII and extended Latin
      .trim();

    // Limit to reasonable size (100KB of text)
    if (extractedText.length > 100000) {
      extractedText = extractedText.substring(0, 100000);
      console.log('Truncated extracted text to 100KB');
    }

    const status = extractedText.length > 50 ? 'processed' : 'failed';
    
    console.log(`Final extraction: ${extractedText.length} chars, status: ${status}`);

    // Update the knowledge source with extracted content
    const { error: updateError } = await supabase
      .from('customer_knowledge_sources')
      .update({
        content_text: extractedText || null,
        status: status
      })
      .eq('id', knowledge_source_id);

    if (updateError) {
      console.error('Failed to update knowledge source:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save parsed content' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully parsed document, status: ${status}, chars: ${extractedText.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        status,
        charCount: extractedText.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-document:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
