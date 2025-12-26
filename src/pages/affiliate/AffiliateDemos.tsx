import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAffiliateDemos } from '@/hooks/useAffiliateDemos';
import { useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/crm/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Globe, Eye, MessageSquare, Phone, Mail, MailOpen, Presentation, TrendingUp, Trash2, FormInput, UserPen, Link2 } from 'lucide-react';
import { format } from 'date-fns';
import { Demo, DemoSource } from '@/hooks/useDemos';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Source filter type
type SourceFilter = 'all' | DemoSource;

// Source display config
const SOURCE_CONFIG: Record<DemoSource, { label: string; icon: React.ReactNode; className: string }> = {
  web_form: {
    label: 'Web Form',
    icon: <FormInput className="h-3 w-3" />,
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  },
  affiliate_manual: {
    label: 'Manual',
    icon: <UserPen className="h-3 w-3" />,
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  },
  landing_page: {
    label: 'Landing Page',
    icon: <Link2 className="h-3 w-3" />,
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  },
};

interface EmailStatus {
  sent: boolean;
  opened: boolean;
}

export default function AffiliateDemos() {
  const { data: demos = [], isLoading } = useAffiliateDemos();
  const queryClient = useQueryClient();
  const [emailStatuses, setEmailStatuses] = useState<Record<string, EmailStatus>>({});
  const [demoToDelete, setDemoToDelete] = useState<Demo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  // Filter demos by source
  const filteredDemos = useMemo(() => {
    if (sourceFilter === 'all') return demos;
    return demos.filter(d => d.source === sourceFilter);
  }, [demos, sourceFilter]);

  // Fetch email statuses for all demos
  useEffect(() => {
    const fetchEmailStatuses = async () => {
      if (demos.length === 0) return;

      const demoIds = demos.map(d => d.id);
      
      // Query emails table to find emails linked to these demos via contact_id
      // Demos have contact_id or lead_id, and emails are linked via contact_id
      const contactIds = demos
        .filter(d => d.contact_id)
        .map(d => d.contact_id);
      
      const leadIds = demos
        .filter(d => d.lead_id)
        .map(d => d.lead_id);

      if (contactIds.length === 0 && leadIds.length === 0) return;

      // Get emails that match demo contacts/leads
      const { data: emails, error } = await supabase
        .from('emails')
        .select('contact_id, status, open_count, opened_at')
        .or(`contact_id.in.(${contactIds.join(',')}),contact_id.in.(${leadIds.join(',')})`);

      if (error) {
        console.error('[AffiliateDemos] Error fetching email statuses:', error);
        return;
      }

      // Map email statuses to demos
      const statusMap: Record<string, EmailStatus> = {};
      demos.forEach(demo => {
        const relatedId = demo.contact_id || demo.lead_id;
        if (!relatedId) {
          statusMap[demo.id] = { sent: false, opened: false };
          return;
        }

        const relatedEmails = emails?.filter(e => e.contact_id === relatedId) || [];
        const hasSent = relatedEmails.some(e => e.status === 'sent' || e.status === 'delivered');
        const hasOpened = relatedEmails.some(e => e.open_count > 0 || e.opened_at);

        statusMap[demo.id] = { sent: hasSent, opened: hasOpened };
      });

      setEmailStatuses(statusMap);
    };

    fetchEmailStatuses();
  }, [demos]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalViews = demos.reduce((sum, d) => sum + (d.view_count || 0), 0);
    const totalChats = demos.reduce((sum, d) => sum + (d.chat_interaction_count || 0), 0);
    const totalVoice = demos.reduce((sum, d) => sum + (d.voice_interaction_count || 0), 0);
    const engagedDemos = demos.filter(d => d.view_count > 0 || d.chat_interaction_count > 0 || d.voice_interaction_count > 0).length;
    const engagementRate = demos.length > 0 ? Math.round((engagedDemos / demos.length) * 100) : 0;
    
    return {
      total: demos.length,
      totalViews,
      totalInteractions: totalChats + totalVoice,
      engagementRate,
    };
  }, [demos]);

  const handleDeleteDemo = async () => {
    if (!demoToDelete) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('demos')
        .delete()
        .eq('id', demoToDelete.id);

      if (error) throw error;

      toast.success(`Demo "${demoToDelete.business_name}" deleted`);
      queryClient.invalidateQueries({ queryKey: ['affiliate-demos'] });
    } catch (error) {
      console.error('[AffiliateDemos] Delete error:', error);
      toast.error('Failed to delete demo');
    } finally {
      setIsDeleting(false);
      setDemoToDelete(null);
    }
  };

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
      key: 'source',
      label: 'Source',
      render: (demo: Demo) => {
        const sourceConfig = SOURCE_CONFIG[demo.source] || SOURCE_CONFIG.affiliate_manual;
        return (
          <Badge className={`flex items-center gap-1 ${sourceConfig.className}`}>
            {sourceConfig.icon}
            {sourceConfig.label}
          </Badge>
        );
      },
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
      key: 'email_status',
      label: 'Email',
      render: (demo: Demo) => {
        const status = emailStatuses[demo.id];
        
        if (!status || (!status.sent && !status.opened)) {
          return <span className="text-sm text-muted-foreground">—</span>;
        }

        return (
          <div className="flex items-center gap-1.5">
            {status.sent && (
              <Badge variant="outline" className="text-xs flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                <Mail className="h-3 w-3" />
                Sent
              </Badge>
            )}
            {status.opened && (
              <Badge variant="outline" className="text-xs flex items-center gap-1 bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                <MailOpen className="h-3 w-3" />
                Opened
              </Badge>
            )}
          </div>
        );
      },
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
    {
      key: 'actions',
      label: '',
      render: (demo: Demo) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            setDemoToDelete(demo);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const handleRowClick = (demo: Demo) => {
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

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Demos</CardTitle>
            <Presentation className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interactions</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInteractions}</div>
            <p className="text-xs text-muted-foreground">Chat + Voice</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.engagementRate}%</div>
            <p className="text-xs text-muted-foreground">Demos with activity</p>
          </CardContent>
        </Card>
      </div>

      {/* Source Filter Tabs */}
      <Tabs value={sourceFilter} onValueChange={(v) => setSourceFilter(v as SourceFilter)} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="all" className="flex items-center gap-1.5">
            All
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{demos.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="web_form" className="flex items-center gap-1.5">
            <FormInput className="h-3.5 w-3.5" />
            Web
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{demos.filter(d => d.source === 'web_form').length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="affiliate_manual" className="flex items-center gap-1.5">
            <UserPen className="h-3.5 w-3.5" />
            Manual
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{demos.filter(d => d.source === 'affiliate_manual').length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="landing_page" className="flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5" />
            Landing
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{demos.filter(d => d.source === 'landing_page').length}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredDemos.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <p className="text-muted-foreground">
            {demos.length === 0 ? 'No demos created yet.' : `No ${sourceFilter === 'all' ? '' : SOURCE_CONFIG[sourceFilter as DemoSource]?.label.toLowerCase() + ' '}demos found.`}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {demos.length === 0 ? 'Create demos from the lead detail page to get started.' : 'Try adjusting your filter.'}
          </p>
        </div>
      ) : (
        <DataTable
          data={filteredDemos}
          columns={columns}
          searchPlaceholder="Search demos..."
          searchKeys={['business_name', 'website_url']}
          onRowClick={handleRowClick}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!demoToDelete} onOpenChange={(open) => !open && setDemoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Demo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the demo for "{demoToDelete?.business_name}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDemo}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}