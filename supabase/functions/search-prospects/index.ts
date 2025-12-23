import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Communication problem keywords to flag
const COMMUNICATION_KEYWORDS = [
  "didn't return",
  "never called back",
  "no response",
  "couldn't reach",
  "won't answer",
  "no callback",
  "voicemail",
  "waiting for",
  "never heard back",
  "poor communication",
  "impossible to reach",
  "ghosted",
  "ignored",
  "didn't call",
  "never responded",
  "hard to reach",
  "can't get ahold",
  "unreachable",
  "missed call",
  "no return call",
  "didn't answer",
  "never answered",
  "MIA",
  "missing in action",
  "no show",
  "stood up",
  "didn't show",
  "never showed",
  "unresponsive",
  "radio silence",
];

interface BusinessResult {
  title: string;
  data_id: string;
  place_id?: string;
  rating?: number;
  reviews?: number;
  address?: string;
  phone?: string;
  website?: string;
  type?: string;
  gps_coordinates?: {
    latitude: number;
    longitude: number;
  };
}

interface ProspectResult {
  name: string;
  dataId: string;
  placeId?: string;
  rating: number;
  reviewCount: number;
  address: string;
  phone?: string;
  website?: string;
  type?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  communicationIssues: {
    flaggedCount: number;
    totalAnalyzed: number;
    flaggedPercentage: number;
    sampleIssues: Array<{
      snippet: string;
      keywords: string[];
      rating: number;
    }>;
  };
  priorityScore: number; // Higher = more likely to need our help
}

function analyzeReviewForCommunicationIssues(snippet: string): { isFlagged: boolean; matchedKeywords: string[] } {
  if (!snippet) return { isFlagged: false, matchedKeywords: [] };
  
  const lowerSnippet = snippet.toLowerCase();
  const matchedKeywords: string[] = [];
  
  for (const keyword of COMMUNICATION_KEYWORDS) {
    if (lowerSnippet.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword);
    }
  }
  
  return {
    isFlagged: matchedKeywords.length > 0,
    matchedKeywords: [...new Set(matchedKeywords)],
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { businessType, location, limit = 10 } = await req.json();
    
    if (!businessType || !location) {
      return new Response(
        JSON.stringify({ error: 'businessType and location are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const SERPAPI_API_KEY = Deno.env.get('SERPAPI_API_KEY');
    if (!SERPAPI_API_KEY) {
      console.error('SERPAPI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'SerpAPI key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Search for businesses
    const searchQuery = `${businessType} near ${location}`;
    console.log('Searching for prospects:', searchQuery);
    
    const searchUrl = `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(searchQuery)}&api_key=${SERPAPI_API_KEY}`;
    
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('SerpAPI search error:', searchResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to search for businesses', details: errorText }),
        { status: searchResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const searchData = await searchResponse.json();
    const businesses: BusinessResult[] = searchData.local_results || [];
    console.log(`Found ${businesses.length} businesses`);
    
    if (businesses.length === 0) {
      return new Response(
        JSON.stringify({ 
          prospects: [], 
          message: 'No businesses found for this search',
          searchQuery,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Analyze reviews for each business (limit to avoid rate limits)
    const businessesToAnalyze = businesses.slice(0, Math.min(limit, 15));
    const prospects: ProspectResult[] = [];
    
    for (const business of businessesToAnalyze) {
      if (!business.data_id) continue;
      
      console.log(`Analyzing reviews for: ${business.title}`);
      
      try {
        // Fetch reviews (sorted by lowest rating to find problem reviews faster)
        const reviewsUrl = `https://serpapi.com/search.json?engine=google_maps_reviews&data_id=${encodeURIComponent(business.data_id)}&api_key=${SERPAPI_API_KEY}&sort_by=lowest_rating`;
        
        const reviewsResponse = await fetch(reviewsUrl);
        if (!reviewsResponse.ok) {
          console.log(`Failed to fetch reviews for ${business.title}, skipping`);
          continue;
        }
        
        const reviewsData = await reviewsResponse.json();
        const reviews = reviewsData.reviews || [];
        
        // Analyze reviews
        let flaggedCount = 0;
        const sampleIssues: Array<{ snippet: string; keywords: string[]; rating: number }> = [];
        
        for (const review of reviews) {
          const analysis = analyzeReviewForCommunicationIssues(review.snippet || '');
          if (analysis.isFlagged) {
            flaggedCount++;
            if (sampleIssues.length < 3) {
              sampleIssues.push({
                snippet: review.snippet?.substring(0, 200) || '',
                keywords: analysis.matchedKeywords,
                rating: review.rating || 0,
              });
            }
          }
        }
        
        // Calculate priority score (higher = more likely to need our service)
        // Factors: more flagged reviews, lower rating, higher review volume
        const flaggedPercentage = reviews.length > 0 ? (flaggedCount / reviews.length) * 100 : 0;
        const ratingPenalty = business.rating ? (5 - business.rating) * 10 : 0;
        const volumeBonus = Math.min((business.reviews || 0) / 10, 10);
        const priorityScore = Math.round(flaggedCount * 20 + flaggedPercentage + ratingPenalty + volumeBonus);
        
        prospects.push({
          name: business.title,
          dataId: business.data_id,
          placeId: business.place_id,
          rating: business.rating || 0,
          reviewCount: business.reviews || 0,
          address: business.address || '',
          phone: business.phone,
          website: business.website,
          type: business.type,
          coordinates: business.gps_coordinates ? {
            lat: business.gps_coordinates.latitude,
            lng: business.gps_coordinates.longitude,
          } : undefined,
          communicationIssues: {
            flaggedCount,
            totalAnalyzed: reviews.length,
            flaggedPercentage: Math.round(flaggedPercentage),
            sampleIssues,
          },
          priorityScore,
        });
        
        console.log(`${business.title}: ${flaggedCount}/${reviews.length} flagged, priority: ${priorityScore}`);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (err) {
        console.error(`Error analyzing ${business.title}:`, err);
        continue;
      }
    }
    
    // Sort by priority score (highest first)
    prospects.sort((a, b) => b.priorityScore - a.priorityScore);
    
    console.log(`Analysis complete: ${prospects.length} prospects analyzed`);
    
    return new Response(
      JSON.stringify({
        prospects,
        searchQuery,
        totalFound: businesses.length,
        analyzed: prospects.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in search-prospects:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
