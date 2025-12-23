import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, ThumbsUp, User, ChevronDown, RefreshCw, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GoogleReview {
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
}

interface PlaceInfo {
  title: string;
  address: string;
  rating: number;
  reviews: number;
}

interface GoogleReviewsPanelProps {
  leadId: string;
  businessName?: string;
  city?: string;
  state?: string;
  googlePlaceId?: string;
}

export function GoogleReviewsPanel({ 
  leadId, 
  businessName, 
  city, 
  state, 
  googlePlaceId 
}: GoogleReviewsPanelProps) {
  const [sortBy, setSortBy] = useState<'most_relevant' | 'newest' | 'highest_rating' | 'lowest_rating'>('most_relevant');
  const [allReviews, setAllReviews] = useState<GoogleReview[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Build search query from business info
  const searchQuery = businessName 
    ? `${businessName}${city ? ` ${city}` : ''}${state ? ` ${state}` : ''}`
    : null;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['google-reviews', leadId, googlePlaceId, searchQuery, sortBy],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-google-reviews', {
        body: { 
          placeId: googlePlaceId,
          query: !googlePlaceId ? searchQuery : undefined,
          sortBy,
        }
      });

      if (error) throw error;
      
      setAllReviews(data.reviews || []);
      setNextPageToken(data.nextPageToken || null);
      
      return data as { 
        reviews: GoogleReview[]; 
        placeInfo: PlaceInfo | null;
        nextPageToken: string | null;
        hasMore: boolean;
      };
    },
    enabled: !!(googlePlaceId || searchQuery),
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });

  const loadMore = async () => {
    if (!nextPageToken || isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      const { data: moreData, error } = await supabase.functions.invoke('fetch-google-reviews', {
        body: { 
          placeId: googlePlaceId || data?.placeInfo?.title,
          nextPageToken,
          sortBy,
        }
      });

      if (error) throw error;

      setAllReviews(prev => [...prev, ...(moreData.reviews || [])]);
      setNextPageToken(moreData.nextPageToken || null);
    } catch (err) {
      console.error('Error loading more reviews:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleSortChange = (newSort: typeof sortBy) => {
    setSortBy(newSort);
    setAllReviews([]);
    setNextPageToken(null);
  };

  if (!searchQuery && !googlePlaceId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No business information available to fetch reviews.</p>
        <p className="text-xs mt-1">Add a company name to see Google reviews.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="space-y-2 p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-destructive mb-2">Failed to load reviews</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (!data?.reviews?.length && allReviews.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No Google reviews found for this business.</p>
        <p className="text-xs mt-1">The business may not have a Google Business listing.</p>
      </div>
    );
  }

  const displayReviews = allReviews.length > 0 ? allReviews : data?.reviews || [];
  const hasMore = nextPageToken !== null;

  return (
    <div className="space-y-4">
      {/* Header with place info and sort */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          {data?.placeInfo && (
            <div className="flex items-center gap-2">
              <span className="font-medium">{data.placeInfo.title}</span>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">{data.placeInfo.rating}</span>
                <span className="text-sm text-muted-foreground">
                  ({data.placeInfo.reviews} reviews)
                </span>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value as typeof sortBy)}
            className="text-sm border rounded-md px-2 py-1 bg-background"
          >
            <option value="most_relevant">Most Relevant</option>
            <option value="newest">Newest</option>
            <option value="highest_rating">Highest Rating</option>
            <option value="lowest_rating">Lowest Rating</option>
          </select>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Reviews list */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
        {displayReviews.map((review, index) => (
          <div key={index} className="p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors">
            {/* User info */}
            <div className="flex items-start gap-3">
              {review.user.thumbnail ? (
                <img 
                  src={review.user.thumbnail} 
                  alt={review.user.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm truncate">{review.user.name}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{review.date}</span>
                </div>
                
                {/* Rating stars */}
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        "h-3.5 w-3.5",
                        star <= review.rating 
                          ? "fill-yellow-400 text-yellow-400" 
                          : "text-muted-foreground/30"
                      )}
                    />
                  ))}
                  {review.user.reviews > 0 && (
                    <span className="text-xs text-muted-foreground ml-2">
                      {review.user.reviews} reviews
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Review content */}
            {review.snippet && (
              <p className="text-sm mt-3 text-foreground/90 leading-relaxed">
                {review.snippet}
              </p>
            )}

            {/* Likes */}
            {review.likes > 0 && (
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <ThumbsUp className="h-3 w-3" />
                <span>{review.likes} found this helpful</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="text-center pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Load More Reviews
              </>
            )}
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Showing {displayReviews.length} reviews • Powered by Google
      </p>
    </div>
  );
}
