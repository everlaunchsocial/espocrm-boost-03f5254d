import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAffiliateDemos } from '@/hooks/useAffiliateDemos';
import { useCurrentAffiliate } from '@/hooks/useCurrentAffiliate';
import { DataTable } from '@/components/crm/DataTable';
import { StatusBadge } from '@/components/crm/StatusBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, Eye, MessageSquare, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { Demo } from '@/hooks/useDemos';

export default function AffiliateDemos() {
  const { data: demos = [], isLoading } = useAffiliateDemos();

  const columns = [
    {
      key: 'business_name',
      label: 'Business',
      render: (demo: Demo) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {demo.business_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium text-foreground">{demo.business_name}</p>
            {demo.website_url && (
              <a 
                href={demo.website_url.startsWith('http') ? demo.website_url : `https://${demo.website_url}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
              >
                <Globe className="h-3 w-3" />
                {demo.website_url.replace(/^https?:\/\//, '').split('/')[0]}
              </a>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (demo: Demo) => {
        const statusColors: Record<string, string> = {
          draft: 'bg-muted text-muted-foreground',
          sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
          viewed: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
          engaged: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        };
        return (
          <Badge className={statusColors[demo.status] || 'bg-muted'}>
            {demo.status.charAt(0).toUpperCase() + demo.status.slice(1)}
          </Badge>
        );
      },
    },
    {
      key: 'voice_provider',
      label: 'Voice',
      render: (demo: Demo) => (
        <Badge variant="outline" className="capitalize">
          {demo.voice_provider}
        </Badge>
      ),
    },
    {
      key: 'engagement',
      label: 'Engagement',
      render: (demo: Demo) => (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1" title="Views">
            <Eye className="h-4 w-4" />
            <span>{demo.view_count}</span>
          </div>
          <div className="flex items-center gap-1" title="Chat interactions">
            <MessageSquare className="h-4 w-4" />
            <span>{demo.chat_interaction_count}</span>
          </div>
          <div className="flex items-center gap-1" title="Voice interactions">
            <Phone className="h-4 w-4" />
            <span>{demo.voice_interaction_count}</span>
          </div>
        </div>
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
  ];

  const handleRowClick = (demo: Demo) => {
    // Navigate to demo detail - use affiliate path
    window.location.href = `/affiliate/demos/${demo.id}`;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading demos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">AI Demos</h1>
          <p className="text-muted-foreground mt-1">Manage your personalized AI demos</p>
        </div>
      </div>

      {demos.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <p className="text-muted-foreground">No demos created yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create demos from the lead detail page to get started.
          </p>
        </div>
      ) : (
        <DataTable
          data={demos}
          columns={columns}
          searchPlaceholder="Search demos..."
          searchKeys={['business_name', 'website_url']}
          onRowClick={handleRowClick}
        />
      )}
    </div>
  );
}
