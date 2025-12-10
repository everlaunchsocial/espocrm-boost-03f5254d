import { Badge } from '@/components/ui/badge';

interface EstimateStatusBadgeProps {
  status: string;
  validUntil?: Date;
}

export const EstimateStatusBadge = ({ status, validUntil }: EstimateStatusBadgeProps) => {
  const isExpired = validUntil && new Date(validUntil) < new Date() && status !== 'accepted' && status !== 'declined';
  
  if (isExpired) {
    return <Badge variant="secondary" className="bg-gray-500 text-white">Expired</Badge>;
  }

  const variants: Record<string, { className: string; label: string }> = {
    draft: { className: 'bg-gray-500 text-white', label: 'Draft' },
    sent: { className: 'bg-blue-500 text-white', label: 'Sent' },
    viewed: { className: 'bg-purple-500 text-white', label: 'Viewed' },
    accepted: { className: 'bg-green-500 text-white', label: 'Accepted' },
    declined: { className: 'bg-red-500 text-white', label: 'Declined' },
  };

  const config = variants[status] || variants.draft;

  return <Badge className={config.className}>{config.label}</Badge>;
};
