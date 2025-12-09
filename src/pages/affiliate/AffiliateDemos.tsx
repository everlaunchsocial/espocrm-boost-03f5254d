import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAffiliateDemos } from '@/hooks/useAffiliateDemos';
import { DataTable } from '@/components/crm/DataTable';
import { Badge } from '@/components/ui/badge';
import { Globe, Eye, MessageSquare, Phone, Mail, MailOpen } from 'lucide-react';
import { format } from 'date-fns';
import { Demo } from '@/hooks/useDemos';
import { supabase } from '@/integrations/supabase/client';

interface EmailStatus {
  sent: boolean;
  opened: boolean;
}

export default function AffiliateDemos() {
  const { data: demos = [], isLoading } = useAffiliateDemos();
  const [emailStatuses, setEmailStatuses] = useState<Record<string, EmailStatus>>({});

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