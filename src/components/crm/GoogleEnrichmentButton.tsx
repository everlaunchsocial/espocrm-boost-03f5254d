import { Button } from '@/components/ui/button';
import { MapPin, Loader2, CheckCircle } from 'lucide-react';
import { useLeadEnrichment } from '@/hooks/useLeadEnrichment';

interface GoogleEnrichmentButtonProps {
  leadId: string;
  hasBeenEnriched?: boolean;
  onEnriched?: () => void;
}

export function GoogleEnrichmentButton({ 
  leadId, 
  hasBeenEnriched = false,
  onEnriched 
}: GoogleEnrichmentButtonProps) {
  const { enrichLead, isEnriching } = useLeadEnrichment();

  const handleEnrich = async () => {
    const result = await enrichLead(leadId);
    if (result && onEnriched) {
      onEnriched();
    }
  };

  if (hasBeenEnriched) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2">
        <CheckCircle className="h-4 w-4 text-green-500" />
        Enriched
      </Button>
    );
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleEnrich}
      disabled={isEnriching}
      className="gap-2"
    >
      {isEnriching ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <MapPin className="h-4 w-4" />
      )}
      {isEnriching ? 'Enriching...' : 'Enrich from Google'}
    </Button>
  );
}
