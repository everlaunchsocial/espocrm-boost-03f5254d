import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  MapPin, 
  Star, 
  Phone, 
  Globe, 
  AlertTriangle, 
  UserPlus, 
  ArrowRight,
  Loader2,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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
  priorityScore: number;
}

export default function ProspectSearch() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [businessType, setBusinessType] = useState('');
  const [location, setLocation] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<ProspectResult[] | null>(null);
  const [searchInfo, setSearchInfo] = useState<{ searchQuery: string; totalFound: number; analyzed: number } | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!businessType.trim() || !location.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter both a business type and location.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setResults(null);
    setSearchInfo(null);

    try {
      const { data, error } = await supabase.functions.invoke('search-prospects', {
        body: { 
          businessType: businessType.trim(), 
          location: location.trim(),
          limit: 10,
        }
      });

      if (error) throw error;

      setResults(data.prospects || []);
      setSearchInfo({
        searchQuery: data.searchQuery,
        totalFound: data.totalFound,
        analyzed: data.analyzed,
      });

      if (data.prospects?.length === 0) {
        toast({
          title: "No results",
          description: "No businesses found for this search. Try a different location or business type.",
        });
      }
    } catch (err) {
      console.error('Search error:', err);
      toast({
        title: "Search failed",
        description: "Failed to search for prospects. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleImport = async (prospect: ProspectResult) => {
    setImportingId(prospect.dataId);
    
    try {
      // Create a new lead from the prospect
      const { data: lead, error } = await supabase
        .from('leads')
        .insert({
          first_name: prospect.name.split(' ')[0] || 'Business',
          last_name: prospect.name.split(' ').slice(1).join(' ') || 'Contact',
          company: prospect.name,
          city: prospect.address.split(',')[1]?.trim() || '',
          state: prospect.address.split(',')[2]?.trim().split(' ')[0] || '',
          phone: prospect.phone || null,
          website: prospect.website || null,
          source: 'prospect_search',
          pipeline_status: 'new_lead',
          google_place_id: prospect.placeId || prospect.dataId,
          google_rating: prospect.rating,
          google_review_count: prospect.reviewCount,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Lead created!",
        description: `${prospect.name} has been added to your leads.`,
      });

      // Navigate to the lead
      navigate(`/crm/leads/${lead.id}`);
    } catch (err) {
      console.error('Import error:', err);
      toast({
        title: "Import failed",
        description: "Failed to create lead. Please try again.",
        variant: "destructive",
      });
    } finally {
      setImportingId(null);
    }
  };

  const getPriorityColor = (score: number) => {
    if (score >= 50) return 'text-red-500';
    if (score >= 25) return 'text-orange-500';
    return 'text-yellow-500';
  };

  const getPriorityLabel = (score: number) => {
    if (score >= 50) return 'High Priority';
    if (score >= 25) return 'Medium Priority';
    return 'Low Priority';
  };

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Target className="h-6 w-6" />
          Prospect Search
        </h1>
        <p className="text-muted-foreground mt-1">
          Find businesses with communication issues — pre-qualified leads for your service.
        </p>
      </div>

      {/* Search Form */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Search for Prospects</CardTitle>
          <CardDescription>
            Enter a business type and location to find potential leads with customer service issues.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessType">Business Type</Label>
              <Input
                id="businessType"
                placeholder="e.g., Plumber, HVAC, Dentist"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="location"
                  placeholder="e.g., Boston, MA or 02101"
                  className="pl-10"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>
          </div>
          <Button 
            className="mt-4 w-full md:w-auto" 
            onClick={handleSearch}
            disabled={isSearching}
          >
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Searching & Analyzing...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Search Prospects
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isSearching && (
        <div className="space-y-4">
          <div className="text-center py-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-2 text-muted-foreground">
              Searching for businesses and analyzing their reviews...
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              This may take up to 30 seconds
            </p>
          </div>
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results */}
      {results && !isSearching && (
        <div className="space-y-4">
          {searchInfo && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Found {searchInfo.totalFound} businesses, analyzed {searchInfo.analyzed} for communication issues
              </span>
              <Badge variant="outline">
                Sorted by priority
              </Badge>
            </div>
          )}

          {results.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">
                  No businesses found for this search.
                </p>
                <p className="text-sm text-muted-foreground">
                  Try a different business type or location.
                </p>
              </CardContent>
            </Card>
          ) : (
            results.map((prospect) => (
              <Card 
                key={prospect.dataId}
                className={cn(
                  "transition-all hover:shadow-md",
                  prospect.communicationIssues.flaggedCount > 0 && "border-orange-500/30"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Priority indicator */}
                    <div className="flex flex-col items-center justify-center min-w-[60px]">
                      <div className={cn("text-2xl font-bold", getPriorityColor(prospect.priorityScore))}>
                        {prospect.priorityScore}
                      </div>
                      <span className="text-xs text-muted-foreground text-center">
                        {getPriorityLabel(prospect.priorityScore)}
                      </span>
                    </div>

                    {/* Business info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold truncate">{prospect.name}</h3>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                              <span>{prospect.rating}</span>
                            </div>
                            <span>•</span>
                            <span>{prospect.reviewCount} reviews</span>
                            {prospect.type && (
                              <>
                                <span>•</span>
                                <span>{prospect.type}</span>
                              </>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            {prospect.address}
                          </p>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleImport(prospect)}
                          disabled={importingId === prospect.dataId}
                        >
                          {importingId === prospect.dataId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4 mr-1" />
                              Import
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Contact info */}
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        {prospect.phone && (
                          <a href={`tel:${prospect.phone}`} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            {prospect.phone}
                          </a>
                        )}
                        {prospect.website && (
                          <a 
                            href={prospect.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                          >
                            <Globe className="h-3.5 w-3.5" />
                            Website
                          </a>
                        )}
                      </div>

                      {/* Communication issues */}
                      {prospect.communicationIssues.flaggedCount > 0 && (
                        <div className="mt-3 p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            <span className="font-medium text-orange-700 dark:text-orange-400 text-sm">
                              {prospect.communicationIssues.flaggedCount} of {prospect.communicationIssues.totalAnalyzed} reviews mention communication issues
                            </span>
                          </div>
                          
                          <Progress 
                            value={prospect.communicationIssues.flaggedPercentage} 
                            className="h-2 mb-3"
                          />

                          {/* Sample issues */}
                          {prospect.communicationIssues.sampleIssues.length > 0 && (
                            <div className="space-y-2">
                              {prospect.communicationIssues.sampleIssues.slice(0, 2).map((issue, i) => (
                                <div key={i} className="text-xs">
                                  <div className="flex items-center gap-1 mb-1">
                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    <span className="text-muted-foreground">{issue.rating}</span>
                                    <span className="text-muted-foreground">•</span>
                                    {issue.keywords.slice(0, 2).map((kw, ki) => (
                                      <Badge key={ki} variant="outline" className="text-[10px] px-1 py-0 border-orange-500/30">
                                        {kw}
                                      </Badge>
                                    ))}
                                  </div>
                                  <p className="text-muted-foreground italic line-clamp-2">
                                    "{issue.snippet}"
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
