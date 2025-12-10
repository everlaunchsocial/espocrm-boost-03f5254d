import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '@/components/crm/DataTable';
import { StatusBadge } from '@/components/crm/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Globe, Eye, MessageCircle, Mic, FileText, Send, Users, Sparkles } from 'lucide-react';
import { useDemos, Demo, DemoStatus } from '@/hooks/useDemos';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, isAfter } from 'date-fns';

type VoiceProviderFilter = 'all' | 'openai' | 'elevenlabs';
type DateRangeFilter = 'all' | '7days' | '30days';

export default function Demos() {
  const navigate = useNavigate();
  
  const [demos, setDemos] = useState<Demo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<DemoStatus | 'all'>('all');
  const [voiceProviderFilter, setVoiceProviderFilter] = useState<VoiceProviderFilter>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>('all');

  // Fetch all demos on mount
  useEffect(() => {
    const fetchDemos = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const { data, error: fetchError } = await supabase
          .from('demos')
          .select('*')
          .order('created_at', { ascending: false });

        if (fetchError) {
          console.error('Error fetching demos:', fetchError);
          setError(`Failed to load demos: ${fetchError.message}`);
          return;
        }

        setDemos((data as Demo[]) ?? []);
      } catch (err) {
        console.error('Unexpected error fetching demos:', err);
        setError('An unexpected error occurred while loading demos');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDemos();
  }, []);

  // Filtered demos based on filter state
  const filteredDemos = useMemo(() => {
    let result = demos;

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(demo => demo.status === statusFilter);
    }

    // Voice provider filter
    if (voiceProviderFilter !== 'all') {
      result = result.filter(demo => demo.voice_provider === voiceProviderFilter);
    }

    // Date range filter
    if (dateRangeFilter !== 'all') {
      const daysAgo = dateRangeFilter === '7days' ? 7 : 30;
      const cutoffDate = subDays(new Date(), daysAgo);
      result = result.filter(demo => isAfter(new Date(demo.created_at), cutoffDate));
    }

    return result;
  }, [demos, statusFilter, voiceProviderFilter, dateRangeFilter]);

  // Stats calculations (from all demos, not filtered)
  const stats = useMemo(() => {
    const sevenDaysAgo = subDays(new Date(), 7);
    
    const sentThisWeek = demos.filter(demo => 
      demo.email_sent_at && isAfter(new Date(demo.email_sent_at), sevenDaysAgo)
    ).length;

    const viewedThisWeek = demos.filter(demo => 
      demo.status !== 'draft' && 
      demo.first_viewed_at && 
      isAfter(new Date(demo.first_viewed_at), sevenDaysAgo)
    ).length;

    const engagedThisWeek = demos.filter(demo => 
      demo.status === 'engaged' &&
      demo.updated_at &&
      isAfter(new Date(demo.updated_at), sevenDaysAgo)
    ).length;

    return {
      total: demos.length,
      sentThisWeek,
      viewedThisWeek,
      engagedThisWeek,
    };
  }, [demos]);

  const columns = [
    {
      key: 'business_name',
      label: 'Business Name',
      render: (demo: Demo) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {demo.business_name.substring(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium text-foreground">{demo.business_name}</p>
            <p className="text-sm text-muted-foreground">{demo.ai_persona_name || 'AI Assistant'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'website_url',
      label: 'Website',
      render: (demo: Demo) => demo.website_url ? (
        <a 
          href={demo.website_url.startsWith('http') ? demo.website_url : `https://${demo.website_url}`} 
          target="_blank" 
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-primary hover:underline flex items-center gap-1.5"
        >
          <Globe className="h-4 w-4" />
          <span className="text-sm truncate max-w-[150px]">
            {demo.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
          </span>
        </a>
      ) : (
        <span className="text-sm text-muted-foreground">-</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (demo: Demo) => (
        <StatusBadge status={demo.status} />
      ),
    },
    {
      key: 'voice_provider',
      label: 'Voice Provider',
      render: (demo: Demo) => (
        <span className="text-sm capitalize">{demo.voice_provider}</span>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (demo: Demo) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(demo.created_at), 'MMM d, yyyy')}
        </span>
      ),
    },
    {
      key: 'engagement',
      label: 'Engagement',
      render: (demo: Demo) => (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1" title="Views">
            <Eye className="h-3.5 w-3.5" />
            <span>{demo.view_count}</span>
          </div>
          <div className="flex items-center gap-1" title="Chat interactions">
            <MessageCircle className="h-3.5 w-3.5" />
            <span>{demo.chat_interaction_count}</span>
          </div>
          <div className="flex items-center gap-1" title="Voice interactions">
            <Mic className="h-3.5 w-3.5" />
            <span>{demo.voice_interaction_count}</span>
          </div>
        </div>
      ),
    },
  ];

  const handleRowClick = (demo: Demo) => {
    navigate(`/demos/${demo.id}`);
  };

  const handleCreate = () => {
    // TODO: Open create demo modal (Phase 3F)
    console.log('Create demo clicked');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading demos...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-destructive">{error}</div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  // Empty state
  if (demos.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">AI Demos</h1>
            <p className="text-muted-foreground mt-1">Personalized AI demos for your leads and contacts</p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Demo
          </Button>
        </div>

        <div className="flex flex-col items-center justify-center h-64 border border-dashed rounded-lg bg-muted/20">
          <div className="text-muted-foreground text-center">
            <p className="text-lg font-medium">No demos yet</p>
            <p className="text-sm mt-1">Create your first personalized AI demo from a lead or contact.</p>
          </div>
          <Button className="mt-4" onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Demo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">AI Demos</h1>
          <p className="text-muted-foreground mt-1">Personalized AI demos for your leads and contacts</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Demo
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Demos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Send className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.sentThisWeek}</p>
                <p className="text-xs text-muted-foreground">Sent This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.viewedThisWeek}</p>
                <p className="text-xs text-muted-foreground">Viewed This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.engagedThisWeek}</p>
                <p className="text-xs text-muted-foreground">Engaged This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Status:</span>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as DemoStatus | 'all')}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="viewed">Viewed</SelectItem>
              <SelectItem value="engaged">Engaged</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Voice:</span>
          <Select value={voiceProviderFilter} onValueChange={(v) => setVoiceProviderFilter(v as VoiceProviderFilter)}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="openai">OpenAI</SelectItem>
              <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Created:</span>
          <Select value={dateRangeFilter} onValueChange={(v) => setDateRangeFilter(v as DateRangeFilter)}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(statusFilter !== 'all' || voiceProviderFilter !== 'all' || dateRangeFilter !== 'all') && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              setStatusFilter('all');
              setVoiceProviderFilter('all');
              setDateRangeFilter('all');
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear Filters
          </Button>
        )}

        <span className="ml-auto text-sm text-muted-foreground">
          Showing {filteredDemos.length} of {demos.length} demos
        </span>
      </div>

      <DataTable
        data={filteredDemos}
        columns={columns}
        searchPlaceholder="Search demos..."
        searchKeys={['business_name', 'website_url', 'ai_persona_name']}
        onRowClick={handleRowClick}
      />
    </div>
  );
}
