import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, User, Mail, Phone, Calendar, CreditCard, 
  ExternalLink, AlertTriangle, CheckCircle2, XCircle,
  MessageSquare, History, HelpCircle, Send
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export interface AffiliateCustomerData {
  id: string;
  businessName: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  websiteUrl?: string | null;
  planName: string | null;
  createdAt: Date | null;
  paymentReceivedAt?: Date | null;
  onboardingStage: string | null;
  // Optional commission info
  commissionAmount?: number;
  commissionLevel?: number;
}

interface AffiliateCustomerDetailDialogProps {
  customer: AffiliateCustomerData | null;
  affiliateUsername?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getCommissionRate(level: number): string {
  switch (level) {
    case 1: return '30%';
    case 2: return '15%';
    case 3: return '5%';
    default: return `${level}%`;
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function getSetupProgress(stage: string | null): { completed: number; total: number; missing: string[] } {
  const allSteps = [
    'Payment received',
    'Phone number connected',
    'Business hours set',
    'Voice settings configured',
    'Live testing complete',
  ];
  
  const stageKey = stage?.toLowerCase() || '';
  
  if (stageKey.includes('complete') || stageKey.includes('done')) {
    return { completed: 5, total: 5, missing: [] };
  }
  
  // Simulate progress based on stage
  let completed = 1; // Payment is assumed complete if they're a customer
  const missing: string[] = [];
  
  if (stageKey.includes('phone')) {
    completed = 2;
  } else {
    missing.push('Phone number not connected');
  }
  
  if (stageKey.includes('hours') || stageKey.includes('business')) {
    completed = Math.max(completed, 3);
  } else if (completed >= 2) {
    missing.push('Business hours not set');
  }
  
  if (stageKey.includes('voice') || stageKey.includes('settings')) {
    completed = Math.max(completed, 4);
  } else if (completed >= 3) {
    missing.push('Voice settings not configured');
  }
  
  if (stageKey.includes('test') || stageKey.includes('live')) {
    completed = 5;
    missing.length = 0;
  } else if (completed >= 4) {
    missing.push('Live testing not complete');
  }
  
  // If none of the above matched, assume only payment complete
  if (completed === 1 && !stageKey.includes('payment')) {
    missing.push('Phone number not connected');
    missing.push('Business hours not set');
    missing.push('Voice settings not configured');
    missing.push('Live testing not complete');
  }
  
  return { completed, total: 5, missing };
}

export function AffiliateCustomerDetailDialog({
  customer,
  affiliateUsername,
  open,
  onOpenChange,
}: AffiliateCustomerDetailDialogProps) {
  if (!customer) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Customer Details Unavailable
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Customer information is not available.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  const progress = getSetupProgress(customer.onboardingStage);
  const isComplete = progress.completed === progress.total;

  const handleEmailClick = () => {
    if (customer.email) {
      const subject = encodeURIComponent('Help with your EverLaunch setup');
      const body = encodeURIComponent(
        `Hi ${customer.contactName || 'there'},\n\nI noticed you haven't completed your EverLaunch setup yet. I'm here to help!\n\nPlease let me know if you have any questions or need assistance getting started.\n\nBest regards,\n${affiliateUsername || 'Your EverLaunch Partner'}`
      );
      window.location.href = `mailto:${customer.email}?subject=${subject}&body=${body}`;
    }
  };

  const handlePhoneClick = () => {
    if (customer.phone) {
      window.location.href = `tel:${customer.phone}`;
    }
  };

  const handleWebsiteClick = () => {
    if (customer.websiteUrl) {
      window.open(customer.websiteUrl.startsWith('http') ? customer.websiteUrl : `https://${customer.websiteUrl}`, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {customer.businessName || 'Customer Details'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Business Info */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Business
            </label>
            <p className="text-lg font-semibold">
              {customer.businessName || 'Unknown Business'}
            </p>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <User className="h-3 w-3" />
                Contact
              </label>
              <p className="font-medium">
                {customer.contactName || 'Not provided'}
              </p>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Mail className="h-3 w-3" />
                Email
              </label>
              {customer.email ? (
                <button
                  onClick={handleEmailClick}
                  className="font-medium text-primary hover:underline flex items-center gap-1 text-left"
                >
                  {customer.email}
                  <Send className="h-3 w-3" />
                </button>
              ) : (
                <p className="text-muted-foreground">Not provided</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Phone className="h-3 w-3" />
                Phone
              </label>
              {customer.phone ? (
                <button
                  onClick={handlePhoneClick}
                  className="font-medium text-primary hover:underline flex items-center gap-1 text-left"
                >
                  {customer.phone}
                  <Phone className="h-3 w-3" />
                </button>
              ) : (
                <p className="text-muted-foreground">Not provided</p>
              )}
            </div>

            {customer.websiteUrl && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />
                  Website
                </label>
                <button
                  onClick={handleWebsiteClick}
                  className="font-medium text-primary hover:underline flex items-center gap-1 text-left truncate"
                >
                  {customer.websiteUrl}
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </button>
              </div>
            )}
          </div>

          <Separator />

          {/* Status & Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Setup Status
              </label>
              <Badge variant={isComplete ? "default" : "secondary"} className={isComplete ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"}>
                {isComplete ? (
                  <><CheckCircle2 className="h-3 w-3 mr-1" /> Complete</>
                ) : (
                  <><AlertTriangle className="h-3 w-3 mr-1" /> {progress.completed} of {progress.total} steps</>
                )}
              </Badge>
            </div>

            {!isComplete && progress.missing.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Missing Steps:</p>
                <ul className="space-y-1">
                  {progress.missing.map((step, idx) => (
                    <li key={idx} className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                      <XCircle className="h-3 w-3" />
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Plan & Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                Plan
              </label>
              <Badge variant="secondary" className="font-medium">
                {customer.planName || 'Unknown'}
              </Badge>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Joined
              </label>
              <p className="font-medium">
                {customer.createdAt ? format(customer.createdAt, 'MMM d, yyyy') : 'Unknown'}
              </p>
              {customer.paymentReceivedAt && (
                <p className="text-xs text-muted-foreground">
                  Paid {formatDistanceToNow(customer.paymentReceivedAt)} ago
                </p>
              )}
            </div>
          </div>

          {/* Commission Info */}
          {customer.commissionAmount !== undefined && customer.commissionLevel !== undefined && (
            <>
              <Separator />
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Your Commission
                </label>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(customer.commissionAmount)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    / month ({getCommissionRate(customer.commissionLevel)})
                  </span>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Quick Actions */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Quick Actions
            </label>
            <div className="flex flex-wrap gap-2">
              {customer.email && (
                <Button variant="outline" size="sm" onClick={handleEmailClick}>
                  <Mail className="h-4 w-4 mr-2" />
                  Email Customer
                </Button>
              )}
              {customer.phone && (
                <Button variant="outline" size="sm" onClick={handlePhoneClick}>
                  <Phone className="h-4 w-4 mr-2" />
                  Call Customer
                </Button>
              )}
              {!isComplete && (
                <Button variant="outline" size="sm" onClick={handleEmailClick}>
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Help Complete Setup
                </Button>
              )}
              <Button variant="ghost" size="sm" disabled>
                <History className="h-4 w-4 mr-2" />
                View Call History
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
