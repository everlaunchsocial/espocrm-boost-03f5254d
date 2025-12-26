import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Building2, User, Mail, Phone, Calendar, CreditCard, ExternalLink, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { CustomerInfo } from '@/hooks/useAffiliateCommissions';

interface CustomerDetailDialogProps {
  customer: CustomerInfo | null;
  commissionAmount?: number;
  commissionLevel?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function getCommissionRate(level: number): string {
  switch (level) {
    case 1: return '30%';
    case 2: return '15%';
    case 3: return '5%';
    default: return `${level}%`;
  }
}

export function CustomerDetailDialog({
  customer,
  commissionAmount,
  commissionLevel,
  open,
  onOpenChange,
}: CustomerDetailDialogProps) {
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
            Customer information is not available for this commission record.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  const handleEmailClick = () => {
    if (customer.email) {
      window.location.href = `mailto:${customer.email}`;
    }
  };

  const handlePhoneClick = () => {
    if (customer.phone) {
      window.location.href = `tel:${customer.phone}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Customer Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Business Name */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Business
            </label>
            <p className="text-lg font-semibold">
              {customer.businessName || 'Unknown Business'}
            </p>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
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
                <Phone className="h-3 w-3" />
                Phone
              </label>
              <p className="font-medium">
                {customer.phone || 'Not provided'}
              </p>
            </div>
          </div>

          {/* Plan & Joined */}
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
            </div>
          </div>

          {/* Commission Info */}
          {commissionAmount !== undefined && commissionLevel !== undefined && (
            <>
              <Separator />
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Your Commission
                </label>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(commissionAmount)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    / month ({getCommissionRate(commissionLevel)})
                  </span>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {customer.email && (
              <Button variant="outline" size="sm" onClick={handleEmailClick}>
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
            )}
            {customer.phone && (
              <Button variant="outline" size="sm" onClick={handlePhoneClick}>
                <Phone className="h-4 w-4 mr-2" />
                Call
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
