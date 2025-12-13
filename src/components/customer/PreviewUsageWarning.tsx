import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, HelpCircle } from 'lucide-react';

interface PreviewUsageWarningProps {
  previewCount: number;
  onContactSupport?: () => void;
}

export function PreviewUsageWarning({ previewCount, onContactSupport }: PreviewUsageWarningProps) {
  // Don't show if under 10 previews
  if (previewCount < 10) {
    return null;
  }

  const isHighUsage = previewCount >= 20;

  return (
    <Card className={`${isHighUsage ? 'bg-orange-500/10 border-orange-500' : 'bg-muted/50'} border`}>
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          {isHighUsage ? (
            <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
          ) : (
            <HelpCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          )}
          
          <div className="flex-1 space-y-2">
            <p className={`text-sm ${isHighUsage ? 'text-orange-600 font-medium' : 'text-muted-foreground'}`}>
              {isHighUsage ? (
                <>You've used <strong>{previewCount}</strong> AI previews. If you're having trouble getting your AI set up correctly, our support team can help!</>
              ) : (
                <>You've tested your AI <strong>{previewCount}</strong> times. Need help fine-tuning your setup?</>
              )}
            </p>
            
            {isHighUsage && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={onContactSupport}
                className="mt-2"
              >
                Contact Support
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
