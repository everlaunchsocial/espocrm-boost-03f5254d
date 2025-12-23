import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  business_status?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  types?: string[];
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  website?: string;
  photos?: { photo_reference: string }[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId } = await req.json();
    
    if (!leadId) {
      return new Response(
        JSON.stringify({ error: 'leadId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!googleApiKey) {
      console.error('GOOGLE_PLACES_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Google Places API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      console.error('Lead not found:', leadError);
      return new Response(
        JSON.stringify({ error: 'Lead not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build search query from lead data
    const searchParts: string[] = [];
    if (lead.company) searchParts.push(lead.company);
    if (lead.city) searchParts.push(lead.city);
    if (lead.state) searchParts.push(lead.state);
    
    if (searchParts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Lead has no company name or location for search' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchQuery = searchParts.join(' ');
    console.log('Searching Google Places for:', searchQuery);

    // Step 1: Find Place from Text
    const findPlaceUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(searchQuery)}&inputtype=textquery&fields=place_id&key=${googleApiKey}`;
    
    const findResponse = await fetch(findPlaceUrl);
    const findData = await findResponse.json();
    
    console.log('Find Place response:', JSON.stringify(findData));

    if (findData.status !== 'OK' || !findData.candidates || findData.candidates.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No matching business found on Google',
          searchQuery,
          status: findData.status 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const placeId = findData.candidates[0].place_id;
    console.log('Found place_id:', placeId);

    // Step 2: Get Place Details
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=place_id,name,formatted_address,formatted_phone_number,international_phone_number,business_status,rating,user_ratings_total,price_level,types,opening_hours,website,photos&key=${googleApiKey}`;
    
    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();
    
    console.log('Place Details response:', JSON.stringify(detailsData));

    if (detailsData.status !== 'OK' || !detailsData.result) {
      return new Response(
        JSON.stringify({ error: 'Failed to get place details', status: detailsData.status }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const place: PlaceResult = detailsData.result;

    // Update lead with enrichment data
    const updateData = {
      google_place_id: place.place_id,
      google_enriched_at: new Date().toISOString(),
      google_business_status: place.business_status || null,
      google_formatted_address: place.formatted_address || null,
      google_formatted_phone: place.formatted_phone_number || place.international_phone_number || null,
      google_types: place.types || null,
      google_opening_hours: place.opening_hours ? {
        open_now: place.opening_hours.open_now,
        weekday_text: place.opening_hours.weekday_text
      } : null,
      google_price_level: place.price_level || null,
      google_rating: place.rating || null,
      google_review_count: place.user_ratings_total || null,
      google_user_ratings_total: place.user_ratings_total || null,
      google_photos_count: place.photos?.length || 0,
      // Also update existing lead fields if they're empty
      ...((!lead.website && place.website) ? { website: place.website, has_website: true } : {}),
      ...((!lead.phone && place.formatted_phone_number) ? { phone: place.formatted_phone_number } : {}),
      ...((!lead.address && place.formatted_address) ? { address: place.formatted_address } : {}),
    };

    const { error: updateError } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', leadId);

    if (updateError) {
      console.error('Failed to update lead:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update lead with enrichment data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully enriched lead:', leadId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        enrichedData: {
          placeId: place.place_id,
          businessStatus: place.business_status,
          rating: place.rating,
          reviewCount: place.user_ratings_total,
          address: place.formatted_address,
          phone: place.formatted_phone_number,
          website: place.website,
          types: place.types,
          photosCount: place.photos?.length || 0
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in enrich-lead-google:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
