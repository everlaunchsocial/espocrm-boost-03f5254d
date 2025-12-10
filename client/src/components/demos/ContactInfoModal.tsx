import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Phone } from 'lucide-react';

interface ContactInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string, phone: string) => void;
  prospectName?: string;
  phoneNumber?: string;
  emailAddress?: string;
  reason?: string;
}

export const ContactInfoModal = ({
  isOpen,
  onClose,
  onSubmit,
  prospectName,
  phoneNumber,
  emailAddress,
  reason,
}: ContactInfoModalProps) => {
  const [email, setEmail] = useState(emailAddress || '');
  const [phone, setPhone] = useState(phoneNumber || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form when props change (AI collected info verbally)
  useState(() => {
    if (emailAddress) setEmail(emailAddress);
    if (phoneNumber) setPhone(phoneNumber);
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    setIsSubmitting(true);
    onSubmit(email.trim(), phone.trim());
    
    // Reset form
    setTimeout(() => {
      setEmail('');
      setPhone('');
      setIsSubmitting(false);
    }, 500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Confirm Your Contact Info
          </DialogTitle>
          <DialogDescription>
            {prospectName && `Thanks ${prospectName}! `}
            Please confirm your contact details below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {reason && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <strong>Reason:</strong> {reason}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!email.trim() || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
