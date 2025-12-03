import { cn } from '@/lib/utils';

type StatusType = 
  | 'active' | 'inactive'
  | 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted'
  | 'customer' | 'partner' | 'prospect'
  | 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost'
  | 'not-started' | 'in-progress' | 'completed' | 'deferred'
  | 'low' | 'medium' | 'high' | 'urgent';

const statusStyles: Record<StatusType, string> = {
  // Contact status
  active: 'bg-success/10 text-success border-success/20',
  inactive: 'bg-muted text-muted-foreground border-muted',
  
  // Lead status
  new: 'bg-primary/10 text-primary border-primary/20',
  contacted: 'bg-warning/10 text-warning border-warning/20',
  qualified: 'bg-success/10 text-success border-success/20',
  unqualified: 'bg-muted text-muted-foreground border-muted',
  converted: 'bg-chart-4/10 text-chart-4 border-chart-4/20',
  
  // Account type
  customer: 'bg-success/10 text-success border-success/20',
  partner: 'bg-chart-4/10 text-chart-4 border-chart-4/20',
  prospect: 'bg-primary/10 text-primary border-primary/20',
  
  // Deal stage
  prospecting: 'bg-muted text-muted-foreground border-muted',
  qualification: 'bg-primary/10 text-primary border-primary/20',
  proposal: 'bg-warning/10 text-warning border-warning/20',
  negotiation: 'bg-chart-4/10 text-chart-4 border-chart-4/20',
  'closed-won': 'bg-success/10 text-success border-success/20',
  'closed-lost': 'bg-destructive/10 text-destructive border-destructive/20',
  
  // Task status
  'not-started': 'bg-muted text-muted-foreground border-muted',
  'in-progress': 'bg-primary/10 text-primary border-primary/20',
  completed: 'bg-success/10 text-success border-success/20',
  deferred: 'bg-warning/10 text-warning border-warning/20',
  
  // Priority
  low: 'bg-muted text-muted-foreground border-muted',
  medium: 'bg-primary/10 text-primary border-primary/20',
  high: 'bg-warning/10 text-warning border-warning/20',
  urgent: 'bg-destructive/10 text-destructive border-destructive/20',
};

const statusLabels: Record<StatusType, string> = {
  active: 'Active',
  inactive: 'Inactive',
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  unqualified: 'Unqualified',
  converted: 'Converted',
  customer: 'Customer',
  partner: 'Partner',
  prospect: 'Prospect',
  prospecting: 'Prospecting',
  qualification: 'Qualification',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  'closed-won': 'Closed Won',
  'closed-lost': 'Closed Lost',
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  completed: 'Completed',
  deferred: 'Deferred',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        statusStyles[status],
        className
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
