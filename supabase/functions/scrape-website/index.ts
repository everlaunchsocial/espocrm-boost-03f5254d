import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      throw new Error('URL is required');
    }

    console.log('Scraping website:', url);

    // Fetch the website content with timeout and better error handling
    let response;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
      if (errorMessage.includes('dns') || errorMessage.includes('lookup') || errorMessage.includes('not known')) {
        throw new Error(`Website not found. Please check the URL is correct: ${url}`);
      }
      if (errorMessage.includes('abort') || errorMessage.includes('timeout')) {
        throw new Error(`Website took too long to respond. Please try again.`);
      }
      throw new Error(`Could not reach website: ${errorMessage}`);
    }

    if (!response.ok) {
      throw new Error(`Website returned error: ${response.status}`);
    }

    const html = await response.text();

    // Extract business information from HTML
    const businessInfo = extractBusinessInfo(html, url);

    console.log('Extracted business info:', businessInfo);

    return new Response(JSON.stringify(businessInfo), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error scraping website:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function extractBusinessInfo(html: string, url: string) {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  // Extract meta description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
  const description = descMatch ? descMatch[1].trim() : '';

  // Extract phone numbers
  const phoneRegex = /(?:\+1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g;
  const phones = [...new Set(html.match(phoneRegex) || [])].slice(0, 3);

  // Extract emails
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = [...new Set(html.match(emailRegex) || [])].filter(e => !e.includes('example') && !e.includes('test')).slice(0, 3);

  // Extract business name from title or domain
  let businessName = title.split('|')[0].split('-')[0].split('–')[0].trim();
  if (!businessName) {
    const urlObj = new URL(url);
    businessName = urlObj.hostname.replace('www.', '').split('.')[0];
    businessName = businessName.charAt(0).toUpperCase() + businessName.slice(1);
  }

  // Try to detect services/industry from content
  const services: string[] = [];
  const serviceKeywords = [
    'plumbing', 'plumber', 'hvac', 'heating', 'cooling', 'air conditioning',
    'roofing', 'roof', 'electrical', 'electrician', 'pest control', 'exterminator',
    'landscaping', 'lawn care', 'painting', 'remodeling', 'renovation',
    'cleaning', 'carpet', 'flooring', 'windows', 'doors', 'siding',
    'fence', 'deck', 'patio', 'concrete', 'masonry', 'drywall',
    'restaurant', 'cafe', 'bakery', 'dental', 'dentist', 'medical',
    'auto repair', 'mechanic', 'salon', 'spa', 'fitness', 'gym'
  ];

  const lowerHtml = html.toLowerCase();
  serviceKeywords.forEach(keyword => {
    if (lowerHtml.includes(keyword) && !services.includes(keyword)) {
      services.push(keyword);
    }
  });

  // Extract address if present
  const addressMatch = html.match(/\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct)[,\s]+[\w\s]+,?\s*[A-Z]{2}\s*\d{5}/i);
  const address = addressMatch ? addressMatch[0].trim() : '';

  // Extract hours if present
  const hoursMatch = html.match(/(?:hours|open|schedule)[:\s]*([^<]+(?:am|pm|AM|PM)[^<]*)/i);
  const hours = hoursMatch ? hoursMatch[1].trim().substring(0, 100) : '';

  return {
    businessName,
    title,
    description,
    phones,
    emails,
    services: services.slice(0, 5),
    address,
    hours,
    url
  };
}
