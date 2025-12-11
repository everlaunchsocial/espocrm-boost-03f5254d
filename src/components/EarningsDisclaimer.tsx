import { useState } from 'react';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface EarningsDisclaimerProps {
  variant: 'inline' | 'card' | 'modal' | 'checkbox';
  showFullLink?: boolean;
  className?: string;
  // For checkbox variant
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  required?: boolean;
}

const SHORT_DISCLAIMER = "* Earnings not guaranteed. Results vary based on individual effort, market conditions, and other factors.";

const FULL_DISCLAIMER = `EARNINGS DISCLAIMER

The income examples and testimonials presented are not intended to represent or guarantee that anyone will achieve the same or similar results. Each individual's success depends on their effort, skills, time commitment, and various market factors.

IMPORTANT NOTICES:

1. NO GUARANTEE OF INCOME
EverLaunch AI makes no guarantees regarding the level of success or income you may experience. The earning potential described is not typical for all participants.

2. INDIVIDUAL RESULTS VARY
The testimonials and examples used are exceptional results, which do not apply to the average purchaser, and are not intended to represent or guarantee that anyone will achieve the same or similar results.

3. COMPENSATION DISCLOSURE
As an affiliate, you may earn commissions on sales generated through your referral links. Commission rates are subject to change. Commissions are earned only when qualifying sales are made.

4. RISK ACKNOWLEDGMENT
Any business endeavor carries inherent risks, and there are no assurances concerning the level of success you may experience. You should carefully consider whether this business opportunity is suitable for you.

5. FTC COMPLIANCE
You agree to comply with all Federal Trade Commission (FTC) guidelines regarding disclosure of material connections and endorsements when promoting EverLaunch AI products or services.

6. PROFESSIONAL ADVICE
This information is for educational purposes only and should not be considered financial, legal, or professional advice. Consult with appropriate professionals before making business decisions.

By participating in the EverLaunch AI affiliate program, you acknowledge that you have read and understood this disclaimer.`;

function FullDisclaimerDialog({ children }: { children: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Earnings Disclaimer
          </DialogTitle>
          <DialogDescription>
            Please read carefully before participating in our affiliate program
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
          {FULL_DISCLAIMER}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function EarningsDisclaimer({
  variant,
  showFullLink = true,
  className,
  checked,
  onCheckedChange,
  required = false,
}: EarningsDisclaimerProps) {
  const [internalChecked, setInternalChecked] = useState(false);

  const handleCheckedChange = (value: boolean) => {
    if (onCheckedChange) {
      onCheckedChange(value);
    } else {
      setInternalChecked(value);
    }
  };

  const isChecked = checked !== undefined ? checked : internalChecked;

  // Inline variant - simple text with optional link
  if (variant === 'inline') {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        {SHORT_DISCLAIMER}{' '}
        {showFullLink && (
          <FullDisclaimerDialog>
            <button className="text-primary hover:underline inline-flex items-center gap-1">
              See full disclaimer
              <ExternalLink className="h-3 w-3" />
            </button>
          </FullDisclaimerDialog>
        )}
      </p>
    );
  }

  // Card variant - styled card with disclaimer
  if (variant === 'card') {
    return (
      <Card className={cn("p-4 bg-amber-500/10 border-amber-500/30", className)}>
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-foreground/80">
              {SHORT_DISCLAIMER}
            </p>
            {showFullLink && (
              <FullDisclaimerDialog>
                <button className="text-sm text-primary hover:underline mt-2 inline-flex items-center gap-1">
                  Read full earnings disclaimer
                  <ExternalLink className="h-3 w-3" />
                </button>
              </FullDisclaimerDialog>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // Modal variant - button that opens modal
  if (variant === 'modal') {
    return (
      <FullDisclaimerDialog>
        <button className={cn("text-sm text-primary hover:underline inline-flex items-center gap-1", className)}>
          <AlertCircle className="h-4 w-4" />
          View Earnings Disclaimer
          <ExternalLink className="h-3 w-3" />
        </button>
      </FullDisclaimerDialog>
    );
  }

  // Checkbox variant - for signup forms
  if (variant === 'checkbox') {
    return (
      <div className={cn("flex items-start gap-3 p-4 rounded-lg border bg-muted/50", className)}>
        <Checkbox
          id="earnings-disclaimer"
          checked={isChecked}
          onCheckedChange={handleCheckedChange}
          required={required}
          className="mt-1"
        />
        <div className="flex-1">
          <Label 
            htmlFor="earnings-disclaimer" 
            className="text-sm cursor-pointer leading-relaxed"
          >
            I understand that earnings are not guaranteed and actual results may vary based on individual effort, market conditions, and other factors.{' '}
            {required && <span className="text-destructive">*</span>}
          </Label>
          <FullDisclaimerDialog>
            <button className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1">
              Read full disclaimer
              <ExternalLink className="h-3 w-3" />
            </button>
          </FullDisclaimerDialog>
        </div>
      </div>
    );
  }

  return null;
}

export default EarningsDisclaimer;
