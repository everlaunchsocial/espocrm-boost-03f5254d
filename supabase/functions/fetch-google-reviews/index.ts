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

interface ReviewResult {
  title: string;
  date: string;
  rating: number;
  snippet: string;
  likes: number;
  user: {
    name: string;
    link: string;
    thumbnail: string;
    reviews: number;
    photos: number;
  };
}

interface SerpApiReviewsResponse {
  reviews: ReviewResult[];
  serpapi_pagination?: {
    next_page_token?: string;
    next?: string;
  };
  place_info?: {
    title: string;
    address: string;
    rating: number;
    reviews: number;
  };
}

interface FlaggedReview {
  title: string;
  date: string;
  rating: number;
  snippet: string;
  likes: number;
  user: {
    name: string;
    thumbnail: string;
    reviews: number;
    photos: number;
  };
  communicationFlags: {
    isFlagged: boolean;
    matchedKeywords: string[];
  };
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
    matchedKeywords: [...new Set(matchedKeywords)], // Remove duplicates
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { placeId, query, nextPageToken, sortBy = 'most_relevant', analyzeKeywords = true } = await req.json();
    
    const SERPAPI_API_KEY = Deno.env.get('SERPAPI_API_KEY');
    if (!SERPAPI_API_KEY) {
      console.error('SERPAPI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'SerpAPI key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let searchUrl: string;
    let foundPlaceId: string | null = null;
    
    if (nextPageToken) {
      // Pagination request
      searchUrl = `https://serpapi.com/search.json?engine=google_maps_reviews&data_id=${encodeURIComponent(placeId)}&next_page_token=${encodeURIComponent(nextPageToken)}&api_key=${SERPAPI_API_KEY}&sort_by=${sortBy}`;
      console.log('Fetching next page of reviews for placeId:', placeId);
    } else if (placeId) {
      // Direct place ID lookup
      searchUrl = `https://serpapi.com/search.json?engine=google_maps_reviews&data_id=${encodeURIComponent(placeId)}&api_key=${SERPAPI_API_KEY}&sort_by=${sortBy}`;
      foundPlaceId = placeId;
      console.log('Fetching reviews for placeId:', placeId);
    } else if (query) {
      // First, find the place
      console.log('Searching for place:', query);
      const findPlaceUrl = `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(query)}&api_key=${SERPAPI_API_KEY}`;
      
      const findResponse = await fetch(findPlaceUrl);
      if (!findResponse.ok) {
        const errorText = await findResponse.text();
        console.error('SerpAPI find place error:', findResponse.status, errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to find place', details: errorText }),
          { status: findResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const findData = await findResponse.json();
      console.log('Find place results count:', findData.local_results?.length || 0);
      
      // Get the first local result's data_id
      const firstResult = findData.local_results?.[0];
      if (!firstResult?.data_id) {
        console.log('No place found for query:', query);
        return new Response(
          JSON.stringify({ 
            reviews: [], 
            placeInfo: null, 
            message: 'No Google Business listing found for this query' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      foundPlaceId = firstResult.data_id;
      console.log('Found place ID:', foundPlaceId, 'for business:', firstResult.title);
      
      searchUrl = `https://serpapi.com/search.json?engine=google_maps_reviews&data_id=${encodeURIComponent(foundPlaceId || '')}&api_key=${SERPAPI_API_KEY}&sort_by=${sortBy}`;
    } else {
      return new Response(
        JSON.stringify({ error: 'Either placeId or query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch reviews
    console.log('Fetching reviews from SerpAPI...');
    const reviewsResponse = await fetch(searchUrl);
    
    if (!reviewsResponse.ok) {
      const errorText = await reviewsResponse.text();
      console.error('SerpAPI reviews error:', reviewsResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch reviews', details: errorText }),
        { status: reviewsResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const reviewsData: SerpApiReviewsResponse = await reviewsResponse.json();
    console.log('Fetched', reviewsData.reviews?.length || 0, 'reviews');

    // Format and analyze reviews
    let flaggedCount = 0;
    const formattedReviews: FlaggedReview[] = (reviewsData.reviews || []).map(review => {
      const communicationFlags = analyzeKeywords 
        ? analyzeReviewForCommunicationIssues(review.snippet || '')
        : { isFlagged: false, matchedKeywords: [] };
      
      if (communicationFlags.isFlagged) {
        flaggedCount++;
        console.log('Flagged review:', review.snippet?.substring(0, 50), 'Keywords:', communicationFlags.matchedKeywords);
      }
      
      return {
        title: review.title || '',
        date: review.date || '',
        rating: review.rating || 0,
        snippet: review.snippet || '',
        likes: review.likes || 0,
        user: {
          name: review.user?.name || 'Anonymous',
          thumbnail: review.user?.thumbnail || '',
          reviews: review.user?.reviews || 0,
          photos: review.user?.photos || 0,
        },
        communicationFlags,
      };
    });

    console.log(`Analysis complete: ${flaggedCount} of ${formattedReviews.length} reviews flagged for communication issues`);

    return new Response(
      JSON.stringify({
        reviews: formattedReviews,
        placeInfo: reviewsData.place_info || null,
        placeId: foundPlaceId || placeId || null,
        nextPageToken: reviewsData.serpapi_pagination?.next_page_token || null,
        hasMore: !!reviewsData.serpapi_pagination?.next_page_token,
        communicationAnalysis: {
          totalReviews: formattedReviews.length,
          flaggedCount,
          flaggedPercentage: formattedReviews.length > 0 
            ? Math.round((flaggedCount / formattedReviews.length) * 100) 
            : 0,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-google-reviews:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
