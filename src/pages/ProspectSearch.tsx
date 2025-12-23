import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  Search, 
  MapPin, 
  Star, 
  Phone, 
  Globe, 
  AlertTriangle, 
  UserPlus, 
  Loader2,
  Target,
  ChevronDown,
  ChevronUp,
  DollarSign,
  List,
  Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';

// State presets with major cities
const STATE_PRESETS: Record<string, string[]> = {
  'Illinois': [
    'Chicago', 'Aurora', 'Naperville', 'Joliet', 'Rockford', 
    'Springfield', 'Elgin', 'Peoria', 'Champaign', 'Waukegan',
    'Cicero', 'Bloomington'
  ],
  'California': [
    'Los Angeles', 'San Diego', 'San Jose', 'San Francisco', 'Fresno',
    'Sacramento', 'Long Beach', 'Oakland', 'Bakersfield', 'Anaheim',
    'Santa Ana', 'Riverside'
  ],
  'Texas': [
    'Houston', 'San Antonio', 'Dallas', 'Austin', 'Fort Worth',
    'El Paso', 'Arlington', 'Corpus Christi', 'Plano', 'Lubbock',
    'Irving', 'Garland'
  ],
  'Florida': [
    'Jacksonville', 'Miami', 'Tampa', 'Orlando', 'St. Petersburg',
    'Hialeah', 'Port St. Lucie', 'Tallahassee', 'Cape Coral', 'Fort Lauderdale',
    'Pembroke Pines', 'Hollywood'
  ],
  'New York': [
    'New York City', 'Buffalo', 'Rochester', 'Yonkers', 'Syracuse',
    'Albany', 'New Rochelle', 'Mount Vernon', 'Schenectady', 'Utica',
    'White Plains', 'Troy'
  ],
};

interface SampleIssue {
  snippet: string;
  keywords: string[];
  rating: number;
  author?: string;
  date?: string;
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
    sampleIssues: SampleIssue[];
  };
  priorityScore: number;
}

interface SearchMetadata {
  totalBusinessesFound: number;
  businessesAnalyzed: number;
  businessesWithIssues: number;
  prospectsReturned: number;
  apiCallsUsed: number;
  estimatedCost: string;
}

interface BatchProgress {
  currentCity: string;
  currentIndex: number;
  totalCities: number;
  totalProspectsFound: number;
  totalBusinessesAnalyzed: number;
  totalApiCalls: number;
}

export default function ProspectSearch() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, isAffiliate } = useUserRole();
  const [businessType, setBusinessType] = useState('');
  const [location, setLocation] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<ProspectResult[] | null>(null);
  const [metadata, setMetadata] = useState<SearchMetadata | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [importingId, setImportingId] = useState<string | null>(null);
  
  // Search options
  const [analyzeLimit, setAnalyzeLimit] = useState(50);
  const [issuesOnly, setIssuesOnly] = useState(true);
  
  // Multi-location state
  const [searchMode, setSearchMode] = useState<'single' | 'multi'>('single');
  const [multiLocations, setMultiLocations] = useState('');
  const [selectedStatePreset, setSelectedStatePreset] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  
  // Expanded dropdown state for each prospect
  const [expandedProspects, setExpandedProspects] = useState<Set<string>>(new Set());

  const toggleExpanded = (dataId: string) => {
    setExpandedProspects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dataId)) {
        newSet.delete(dataId);
      } else {
        newSet.add(dataId);
      }
      return newSet;
    });
  };

  // Get locations list from multi-location input or state preset
  const getLocationsList = (): string[] => {
    if (selectedStatePreset && STATE_PRESETS[selectedStatePreset]) {
      return STATE_PRESETS[selectedStatePreset].map(city => `${city}, ${selectedStatePreset}`);
    }
    return multiLocations
      .split('\n')
      .map(loc => loc.trim())
      .filter(loc => loc.length > 0);
  };

  // Calculate estimated cost for multi-location search
  const getMultiLocationEstimate = () => {
    const locations = getLocationsList();
    const businessesPerCity = 20; // SerpAPI typically returns ~20 per search
    const totalBusinesses = locations.length * businessesPerCity;
    const apiCalls = locations.length + totalBusinesses; // 1 search + reviews per business
    const cost = apiCalls * 0.01;
    const expectedLeads = Math.round(totalBusinesses * 0.05); // 5% hit rate
    
    return {
      cities: locations.length,
      estimatedBusinesses: totalBusinesses,
      estimatedCost: cost.toFixed(2),
      expectedLeads,
    };
  };

  const handleSingleSearch = async () => {
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
    setMetadata(null);
    setExpandedProspects(new Set());
    setBatchProgress(null);

    try {
      const { data, error } = await supabase.functions.invoke('search-prospects', {
        body: { 
          businessType: businessType.trim(), 
          location: location.trim(),
          analyzeLimit,
          issuesOnly,
          minFlagged: 1,
        }
      });

      if (error) throw error;

      setResults(data.prospects || []);
      setMetadata(data.metadata || null);
      setSearchQuery(data.searchQuery || '');

      if (data.prospects?.length === 0) {
        toast({
          title: issuesOnly ? "No communication issues found" : "No results",
          description: issuesOnly 
            ? `Analyzed ${data.metadata?.businessesAnalyzed || 0} businesses - none had communication-related complaints. Try increasing the analysis limit or a different location.`
            : "No businesses found for this search. Try a different location or business type.",
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

  const handleMultiLocationSearch = async () => {
    const locations = getLocationsList();
    
    if (!businessType.trim()) {
      toast({
        title: "Missing business type",
        description: "Please enter a business type to search for.",
        variant: "destructive",
      });
      return;
    }
    
    if (locations.length === 0) {
      toast({
        title: "No locations",
        description: "Please enter at least one location or select a state preset.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setResults(null);
    setMetadata(null);
    setExpandedProspects(new Set());

    const allProspects: ProspectResult[] = [];
    const seenDataIds = new Set<string>();
    let totalBusinessesAnalyzed = 0;
    let totalBusinessesWithIssues = 0;
    let totalApiCalls = 0;

    try {
      for (let i = 0; i < locations.length; i++) {
        const loc = locations[i];
        
        setBatchProgress({
          currentCity: loc,
          currentIndex: i + 1,
          totalCities: locations.length,
          totalProspectsFound: allProspects.length,
          totalBusinessesAnalyzed,
          totalApiCalls,
        });

        try {
          const { data, error } = await supabase.functions.invoke('search-prospects', {
            body: { 
              businessType: businessType.trim(), 
              location: loc,
              analyzeLimit: 20, // Per-city limit to keep costs reasonable
              issuesOnly,
              minFlagged: 1,
            }
          });

          if (error) {
            console.error(`Error searching ${loc}:`, error);
            continue;
          }

          // Track stats
          if (data.metadata) {
            totalBusinessesAnalyzed += data.metadata.businessesAnalyzed || 0;
            totalBusinessesWithIssues += data.metadata.businessesWithIssues || 0;
            totalApiCalls += data.metadata.apiCallsUsed || 0;
          }

          // De-duplicate and add results
          if (data.prospects) {
            for (const prospect of data.prospects) {
              if (!seenDataIds.has(prospect.dataId)) {
                seenDataIds.add(prospect.dataId);
                allProspects.push(prospect);
              }
            }
          }
        } catch (cityError) {
          console.error(`Failed to search ${loc}:`, cityError);
        }
      }

      // Sort all results by priority score
      allProspects.sort((a, b) => b.priorityScore - a.priorityScore);

      setResults(allProspects);
      setMetadata({
        totalBusinessesFound: totalBusinessesAnalyzed,
        businessesAnalyzed: totalBusinessesAnalyzed,
        businessesWithIssues: totalBusinessesWithIssues,
        prospectsReturned: allProspects.length,
        apiCallsUsed: totalApiCalls,
        estimatedCost: `$${(totalApiCalls * 0.01).toFixed(2)}`,
      });

      toast({
        title: "Multi-location search complete",
        description: `Found ${allProspects.length} prospects across ${locations.length} cities.`,
      });
    } catch (err) {
      console.error('Multi-search error:', err);
      toast({
        title: "Search failed",
        description: "Failed to complete multi-location search.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
      setBatchProgress(null);
    }
  };

  const handleSearch = () => {
    if (searchMode === 'single') {
      handleSingleSearch();
    } else {
      handleMultiLocationSearch();
    }
  };

  const handleImport = async (prospect: ProspectResult) => {
    setImportingId(prospect.dataId);
    
    try {
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
          google_place_id: prospect.dataId,
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

      if (isAdmin) {
        navigate(`/leads?open=${lead.id}`);
      } else if (isAffiliate) {
        navigate(`/affiliate/leads?open=${lead.id}`);
      } else {
        toast({
          title: "Lead created!",
          description: `${prospect.name} has been added. View in your leads area.`,
        });
      }
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

  const multiEstimate = searchMode === 'multi' ? getMultiLocationEstimate() : null;

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
          {/* Search Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={searchMode === 'single' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSearchMode('single')}
              className="flex items-center gap-2"
            >
              <MapPin className="h-4 w-4" />
              Single Location
            </Button>
            <Button
              variant={searchMode === 'multi' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSearchMode('multi')}
              className="flex items-center gap-2"
            >
              <List className="h-4 w-4" />
              Multi-Location
            </Button>
          </div>

          <div className="space-y-4">
            {/* Business Type - Always shown */}
            <div className="space-y-2">
              <Label htmlFor="businessType">Business Type</Label>
              <Input
                id="businessType"
                placeholder="e.g., Property Management, Doctor's office, HVAC"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchMode === 'single' && handleSearch()}
              />
            </div>

            {/* Single Location Mode */}
            {searchMode === 'single' && (
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
            )}

            {/* Multi-Location Mode */}
            {searchMode === 'multi' && (
              <div className="space-y-4">
                {/* State Presets */}
                <div className="space-y-2">
                  <Label>State Preset (optional)</Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(STATE_PRESETS).map(state => (
                      <Button
                        key={state}
                        variant={selectedStatePreset === state ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          if (selectedStatePreset === state) {
                            setSelectedStatePreset(null);
                          } else {
                            setSelectedStatePreset(state);
                            setMultiLocations(''); // Clear manual input when preset selected
                          }
                        }}
                      >
                        <Building2 className="h-3 w-3 mr-1" />
                        {state} ({STATE_PRESETS[state].length} cities)
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Manual Location Input */}
                {!selectedStatePreset && (
                  <div className="space-y-2">
                    <Label htmlFor="multiLocations">Locations (one per line)</Label>
                    <Textarea
                      id="multiLocations"
                      placeholder="Chicago, IL&#10;Aurora, IL&#10;Naperville, IL"
                      value={multiLocations}
                      onChange={(e) => setMultiLocations(e.target.value)}
                      rows={4}
                    />
                  </div>
                )}

                {/* Cost Estimate */}
                {multiEstimate && multiEstimate.cities > 0 && (
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="text-sm font-medium">Search Estimate</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Cities</div>
                        <div className="font-medium">{multiEstimate.cities}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Est. Businesses</div>
                        <div className="font-medium">~{multiEstimate.estimatedBusinesses}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Est. Cost</div>
                        <div className="font-medium text-orange-600">${multiEstimate.estimatedCost}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Expected Leads (5%)</div>
                        <div className="font-medium text-green-600">~{multiEstimate.expectedLeads}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Search Options - Only for single mode */}
          {searchMode === 'single' && (
            <div className="flex flex-wrap items-center gap-6 mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Label htmlFor="analyzeLimit" className="text-sm whitespace-nowrap">Analyze:</Label>
                <select
                  id="analyzeLimit"
                  value={analyzeLimit}
                  onChange={(e) => setAnalyzeLimit(Number(e.target.value))}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value={10}>10 businesses (~$0.11)</option>
                  <option value={25}>25 businesses (~$0.26)</option>
                  <option value={50}>50 businesses (~$0.51)</option>
                  <option value={75}>75 businesses (~$0.76)</option>
                  <option value={100}>100 businesses (~$1.01)</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  id="issuesOnly"
                  checked={issuesOnly}
                  onCheckedChange={setIssuesOnly}
                />
                <Label htmlFor="issuesOnly" className="text-sm cursor-pointer">
                  Only show businesses with issues
                </Label>
              </div>
            </div>
          )}
          
          <Button 
            className="mt-4 w-full md:w-auto" 
            onClick={handleSearch}
            disabled={isSearching}
          >
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {searchMode === 'multi' ? 'Searching Locations...' : 'Searching & Analyzing...'}
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                {searchMode === 'multi' ? `Search ${multiEstimate?.cities || 0} Locations` : 'Search Prospects'}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Batch Progress */}
      {batchProgress && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  Searching: {batchProgress.currentCity}
                </span>
                <span className="text-muted-foreground">
                  City {batchProgress.currentIndex} of {batchProgress.totalCities}
                </span>
              </div>
              <Progress 
                value={(batchProgress.currentIndex / batchProgress.totalCities) * 100} 
                className="h-2"
              />
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Businesses analyzed: {batchProgress.totalBusinessesAnalyzed}</span>
                <span>•</span>
                <span>Prospects found: {batchProgress.totalProspectsFound}</span>
                <span>•</span>
                <span>API calls: {batchProgress.totalApiCalls}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State - Single Search */}
      {isSearching && !batchProgress && (
        <div className="space-y-4">
          <div className="text-center py-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-2 text-muted-foreground">
              Searching for businesses and analyzing their reviews...
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Analyzing {analyzeLimit} businesses • This may take {Math.ceil(analyzeLimit * 1.5)} seconds
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
          {/* Results Header with Metadata */}
          {metadata && (
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <span className="font-medium">
                  Analyzed {metadata.businessesAnalyzed} businesses
                </span>
                <span className="text-muted-foreground">•</span>
                <span className={cn(
                  metadata.businessesWithIssues > 0 ? "text-orange-600 font-medium" : "text-muted-foreground"
                )}>
                  {metadata.businessesWithIssues} with communication issues
                </span>
                <span className="text-muted-foreground">•</span>
                <span>
                  Showing {metadata.prospectsReturned}
                </span>
                <div className="ml-auto flex items-center gap-1 text-muted-foreground">
                  <DollarSign className="h-3.5 w-3.5" />
                  <span>{metadata.estimatedCost} API cost</span>
                </div>
              </div>
            </div>
          )}

          {results.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="mt-4 font-medium">
                  {issuesOnly ? "No communication issues found" : "No businesses found"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {issuesOnly 
                    ? `Analyzed ${metadata?.businessesAnalyzed || 0} businesses - none had communication-related complaints.`
                    : "Try a different business type or location."
                  }
                </p>
                {issuesOnly && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Try increasing the "Analyze" limit or searching in a different location.
                  </p>
                )}
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

                      {/* Communication issues - Problem Preview */}
                      {prospect.communicationIssues.flaggedCount > 0 && (
                        <div className="mt-3 p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            <span className="font-medium text-orange-700 dark:text-orange-400 text-sm">
                              {prospect.communicationIssues.flaggedCount} of {prospect.communicationIssues.totalAnalyzed} reviews mention communication issues
                            </span>
                          </div>
                          
                          {/* Problem Preview - First Issue */}
                          {prospect.communicationIssues.sampleIssues.length > 0 && (
                            <div className="space-y-2">
                              {/* First review always visible */}
                              <div className="text-xs">
                                <div className="flex items-center gap-1 mb-1 flex-wrap">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  <span className="text-muted-foreground">{prospect.communicationIssues.sampleIssues[0].rating}</span>
                                  {prospect.communicationIssues.sampleIssues[0].author && (
                                    <>
                                      <span className="text-muted-foreground">•</span>
                                      <span className="text-muted-foreground">{prospect.communicationIssues.sampleIssues[0].author}</span>
                                    </>
                                  )}
                                  {prospect.communicationIssues.sampleIssues[0].keywords.slice(0, 3).map((kw, ki) => (
                                    <Badge key={ki} variant="outline" className="text-[10px] px-1 py-0 border-orange-500/30 text-orange-600">
                                      {kw}
                                    </Badge>
                                  ))}
                                </div>
                                  <p className="text-muted-foreground italic break-words">
                                    "{prospect.communicationIssues.sampleIssues[0].snippet}"
                                  </p>
                              </div>

                              {/* Expandable section for more reviews */}
                              {prospect.communicationIssues.sampleIssues.length > 1 && (
                                <Collapsible 
                                  open={expandedProspects.has(prospect.dataId)}
                                  onOpenChange={() => toggleExpanded(prospect.dataId)}
                                >
                                  <CollapsibleTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="w-full text-xs h-7 text-orange-600 hover:text-orange-700 hover:bg-orange-500/10"
                                    >
                                      {expandedProspects.has(prospect.dataId) ? (
                                        <>
                                          <ChevronUp className="h-3 w-3 mr-1" />
                                          Hide {prospect.communicationIssues.sampleIssues.length - 1} more flagged reviews
                                        </>
                                      ) : (
                                        <>
                                          <ChevronDown className="h-3 w-3 mr-1" />
                                          View all {prospect.communicationIssues.sampleIssues.length} flagged reviews
                                        </>
                                      )}
                                    </Button>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="space-y-2 mt-2">
                                    {prospect.communicationIssues.sampleIssues.slice(1).map((issue, i) => (
                                      <div key={i} className="text-xs border-t border-orange-500/10 pt-2">
                                        <div className="flex items-center gap-1 mb-1 flex-wrap">
                                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                          <span className="text-muted-foreground">{issue.rating}</span>
                                          {issue.author && (
                                            <>
                                              <span className="text-muted-foreground">•</span>
                                              <span className="text-muted-foreground">{issue.author}</span>
                                            </>
                                          )}
                                          {issue.date && (
                                            <>
                                              <span className="text-muted-foreground">•</span>
                                              <span className="text-muted-foreground">{issue.date}</span>
                                            </>
                                          )}
                                          {issue.keywords.slice(0, 3).map((kw, ki) => (
                                            <Badge key={ki} variant="outline" className="text-[10px] px-1 py-0 border-orange-500/30 text-orange-600">
                                              {kw}
                                            </Badge>
                                          ))}
                                        </div>
                                        <p className="text-muted-foreground italic">
                                          "{issue.snippet}"
                                        </p>
                                      </div>
                                    ))}
                                  </CollapsibleContent>
                                </Collapsible>
                              )}
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
