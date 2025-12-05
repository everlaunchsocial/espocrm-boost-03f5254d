import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '@/components/crm/DataTable';
import { StatusBadge } from '@/components/crm/StatusBadge';
import { Button } from '@/components/ui/button';
import { Plus, Globe, Eye, MessageCircle, Mic } from 'lucide-react';
import { useDemos, Demo } from '@/hooks/useDemos';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export default function Demos() {
  const navigate = useNavigate();
  
  const [demos, setDemos] = useState<Demo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      <DataTable
        data={demos}
        columns={columns}
        searchPlaceholder="Search demos..."
        searchKeys={['business_name', 'website_url', 'ai_persona_name']}
        onRowClick={handleRowClick}
      />
    </div>
  );
}
