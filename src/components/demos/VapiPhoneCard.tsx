import { Phone, PhoneCall, PhoneOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface VapiPhoneCardProps {
  aiPersonaName: string;
  avatarUrl?: string;
  phoneNumber: string;
  isCallActive?: boolean;
  onCallStart?: () => void;
  onCallEnd?: () => void;
}

export const VapiPhoneCard = ({
  aiPersonaName,
  avatarUrl,
  phoneNumber,
  isCallActive = false,
  onCallStart,
  onCallEnd,
}: VapiPhoneCardProps) => {
  const initials = aiPersonaName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Format phone number for display
  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  // Create tel: link
  const telLink = `tel:${phoneNumber.replace(/\D/g, '')}`;

  return (
    <Card className="shadow-xl border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <Avatar className="h-14 w-14 ring-2 ring-green-500/20">
            <AvatarImage src={avatarUrl} alt={aiPersonaName} />
            <AvatarFallback className="bg-green-500 text-white text-lg font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-foreground">{aiPersonaName}</h3>
            <p className="text-sm text-muted-foreground">AI Phone Assistant</p>
          </div>
          <div className="p-2 bg-green-500/10 rounded-full">
            <Phone className="h-5 w-5 text-green-600" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white/60 dark:bg-black/20 rounded-lg p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Call to talk with the AI</p>
            <a 
              href={telLink}
              className="text-xl font-bold text-green-600 hover:text-green-700 transition-colors"
            >
              {formatPhoneNumber(phoneNumber)}
            </a>
          </div>

          <a 
            href={telLink}
            className="block"
            onClick={onCallStart}
          >
            <Button 
              className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
              size="lg"
            >
              <PhoneCall className="h-5 w-5" />
              Call Now
            </Button>
          </a>

          <p className="text-xs text-center text-muted-foreground">
            Tap to call from your phone. Standard rates may apply.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
