import { Check, ChevronDown, Circle, User, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUpdateLead } from '@/hooks/useCRMData';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { PIPELINE_STATUS_CONFIG, PipelineStatus } from '@/lib/pipelineStatus';
import { Lead } from '@/types/crm';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LeadStatusEditorProps {
  lead: Lead;
}

const LEAD_STATUSES = [
  { value: 'new', label: 'New', icon: '🔵', color: 'text-blue-600 bg-blue-100' },
  { value: 'contacted', label: 'Contacted', icon: '🟡', color: 'text-amber-600 bg-amber-100' },
  { value: 'qualified', label: 'Qualified', icon: '🟢', color: 'text-green-600 bg-green-100' },
  { value: 'unqualified', label: 'Unqualified', icon: '🔴', color: 'text-red-600 bg-red-100' },
  { value: 'converted', label: 'Converted', icon: '✅', color: 'text-emerald-600 bg-emerald-100' },
];

const PIPELINE_STATUSES = [
  { value: 'new_lead', label: 'New' },
  { value: 'contact_attempted', label: 'Contact attempted' },
  { value: 'demo_created', label: 'Demo created' },
  { value: 'demo_sent', label: 'Demo sent' },
  { value: 'demo_engaged', label: 'Demo engaged' },
  { value: 'ready_to_buy', label: 'Ready to buy' },
  { value: 'customer_won', label: 'Customer' },
  { value: 'lost_closed', label: 'Closed – Lost' },
];

export function LeadStatusEditor({ lead }: LeadStatusEditorProps) {
  const { isEnabled } = useFeatureFlags();
  const updateLead = useUpdateLead();

  if (!isEnabled('aiCrmPhase2')) return null;

  const currentStatus = LEAD_STATUSES.find(s => s.value === lead.status) || LEAD_STATUSES[0];
  const currentPipeline = PIPELINE_STATUSES.find(s => s.value === (lead.pipelineStatus || 'new_lead')) || PIPELINE_STATUSES[0];
  const pipelineConfig = PIPELINE_STATUS_CONFIG[(lead.pipelineStatus || 'new_lead') as PipelineStatus];

  const handleStatusChange = async (value: string) => {
    try {
      await updateLead.mutateAsync({ id: lead.id, lead: { status: value as Lead['status'] } });
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handlePipelineChange = async (value: string) => {
    try {
      await updateLead.mutateAsync({ id: lead.id, lead: { pipelineStatus: value as Lead['pipelineStatus'] } });
      toast.success('Pipeline stage updated');
    } catch {
      toast.error('Failed to update pipeline');
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap mt-2">
      {/* Lead Status Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-7 text-xs gap-1.5 font-medium",
              currentStatus.color
            )}
          >
            <User className="h-3 w-3" />
            {currentStatus.label}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {LEAD_STATUSES.map((status) => (
            <DropdownMenuItem
              key={status.value}
              onClick={() => handleStatusChange(status.value)}
              className="gap-2"
            >
              <span>{status.icon}</span>
              <span>{status.label}</span>
              {lead.status === status.value && (
                <Check className="h-3.5 w-3.5 ml-auto text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Pipeline Stage Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-7 text-xs gap-1.5 font-medium",
              pipelineConfig.bgColor,
              pipelineConfig.color
            )}
          >
            <Target className="h-3 w-3" />
            {pipelineConfig.label}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {PIPELINE_STATUSES.map((status) => {
            const config = PIPELINE_STATUS_CONFIG[status.value as PipelineStatus];
            return (
              <DropdownMenuItem
                key={status.value}
                onClick={() => handlePipelineChange(status.value)}
                className="gap-2"
              >
                <Circle className={cn("h-2.5 w-2.5 fill-current", config.color)} />
                <span>{status.label}</span>
                {lead.pipelineStatus === status.value && (
                  <Check className="h-3.5 w-3.5 ml-auto text-primary" />
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
