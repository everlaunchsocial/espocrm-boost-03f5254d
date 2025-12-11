import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Copy, ExternalLink, Check } from 'lucide-react';
import { useCurrentAffiliate } from '@/hooks/useCurrentAffiliate';
import { verticalsList } from '@/lib/verticalConfig';
import { getReplicatedDomain } from '@/utils/subdomainRouting';

export default function AffiliateSalesTools() {
  const { affiliate, isLoading } = useCurrentAffiliate();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const domain = getReplicatedDomain();
  const username = affiliate?.username || 'your-username';

  const copyLink = (vertical: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(vertical);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-64 bg-muted rounded mb-2" />
          <div className="h-4 w-96 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sales Tools</h1>
        <p className="text-muted-foreground">
          Industry-specific landing pages to share with your prospects
        </p>
      </div>

      {/* Info Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-2">Your Personalized Sales Pages</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Each page is branded with your affiliate link. When prospects visit and sign up, 
            they're automatically attributed to you for commissions.
          </p>
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="secondary">Your Username</Badge>
            <code className="bg-background px-2 py-1 rounded text-primary font-mono">
              {username}
            </code>
          </div>
        </CardContent>
      </Card>

      {/* Vertical Landing Pages Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {verticalsList.map((vertical) => {
          const url = `https://${domain}/${username}/sales/${vertical.key}`;
          const isCopied = copiedId === vertical.key;

          return (
            <Card key={vertical.key} className="overflow-hidden group hover:shadow-lg transition-shadow">
              {/* Thumbnail */}
              <div className="relative h-40 overflow-hidden">
                <img 
                  src={vertical.thumbnail} 
                  alt={vertical.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-3">
                  <Badge className="bg-white/90 text-foreground hover:bg-white">
                    {vertical.industry}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-4">
                <h3 className="font-semibold mb-1">{vertical.name}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {vertical.headline}
                </p>

                {/* URL Preview */}
                <div className="bg-muted rounded-lg p-2 mb-4">
                  <code className="text-xs text-muted-foreground break-all">
                    {url}
                  </code>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => copyLink(vertical.key, url)}
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy Link
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => window.open(url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tips for Using Sales Pages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>• <strong>Share the right page:</strong> Send dentist prospects to the dental page, contractors to home improvement, etc.</p>
          <p>• <strong>Social media:</strong> These pages work great as links in your social media bios and posts.</p>
          <p>• <strong>Text messages:</strong> The short URLs are easy to share via text.</p>
          <p>• <strong>Follow up:</strong> Check your Leads page to see who's requested demos from your pages.</p>
        </CardContent>
      </Card>
    </div>
  );
}
