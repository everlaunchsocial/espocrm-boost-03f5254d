import { useState } from 'react';
import { useCampaignStats, useCreateCampaignFromTemplate, useUpdateCampaign, CAMPAIGN_TEMPLATES } from '@/hooks/useCampaigns';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Play, Pause, Mail, MessageSquare, Phone, CheckCircle, Clock, Users, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const channelIcons = {
  email: Mail,
  sms: MessageSquare,
  call_reminder: Phone,
  task: CheckCircle,
};

export default function Campaigns() {
  const { isEnabled } = useFeatureFlags();
  const { data: campaigns = [], isLoading, refetch } = useCampaignStats();
  const createFromTemplate = useCreateCampaignFromTemplate();
  const updateCampaign = useUpdateCampaign();
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  if (!isEnabled('aiCrmPhase4')) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-semibold mb-2">Campaigns</h1>
        <p className="text-muted-foreground">This feature is not enabled yet.</p>
      </div>
    );
  }

  const handleCreateFromTemplate = async (templateKey: keyof typeof CAMPAIGN_TEMPLATES) => {
    await createFromTemplate.mutateAsync(templateKey);
    setShowTemplateDialog(false);
    refetch();
  };

  const handleToggleStatus = async (campaignId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    await updateCampaign.mutateAsync({ id: campaignId, status: newStatus });
    refetch();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success/10 text-success border-success/20';
      case 'paused': return 'bg-warning/10 text-warning border-warning/20';
      case 'completed': return 'bg-primary/10 text-primary border-primary/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Campaigns</h1>
          <p className="text-muted-foreground">Automated multi-step follow-up sequences</p>
        </div>
        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Campaign from Template</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 mt-4">
              {Object.entries(CAMPAIGN_TEMPLATES).map(([key, template]) => (
                <Card 
                  key={key} 
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleCreateFromTemplate(key as keyof typeof CAMPAIGN_TEMPLATES)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{template.steps.length} steps</span>
                      <span>•</span>
                      <span>{template.steps[template.steps.length - 1].delay_days} days total</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        {[...new Set(template.steps.map(s => s.channel))].map(channel => {
                          const Icon = channelIcons[channel];
                          return <Icon key={channel} className="h-4 w-4" />;
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="p-12 text-center">
          <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">No campaigns yet</h3>
          <p className="text-muted-foreground mb-4">Create your first campaign to automate follow-ups</p>
          <Button onClick={() => setShowTemplateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Campaign
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {campaign.name}
                      <Badge variant="outline" className={getStatusColor(campaign.status)}>
                        {campaign.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{campaign.description}</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleStatus(campaign.id, campaign.status)}
                    disabled={campaign.status === 'completed'}
                  >
                    {campaign.status === 'active' ? (
                      <><Pause className="h-4 w-4 mr-1" /> Pause</>
                    ) : (
                      <><Play className="h-4 w-4 mr-1" /> Activate</>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{campaign.enrollments_count} enrolled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{campaign.active_count} active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    <span>{campaign.completed_count} completed</span>
                  </div>
                  <span className="text-muted-foreground">
                    Created {formatDistanceToNow(new Date(campaign.created_at), { addSuffix: true })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
