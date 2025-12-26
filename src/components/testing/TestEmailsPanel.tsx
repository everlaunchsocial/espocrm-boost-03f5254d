import { useState } from "react";
import { useTestEmails } from "@/hooks/useTestEmails";
import { useTestMode } from "@/hooks/useTestMode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Mail, 
  RefreshCw, 
  ExternalLink, 
  Copy, 
  ChevronDown, 
  CheckCircle2,
  Clock,
  Link as LinkIcon
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function TestEmailsPanel() {
  const { enabled } = useTestMode();
  const [searchEmail, setSearchEmail] = useState("");
  const [activeEmail, setActiveEmail] = useState<string | null>(null);
  const { data, isLoading, refetch, isRefetching } = useTestEmails(activeEmail);
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());

  if (!enabled) {
    return null;
  }

  const handleSearch = () => {
    if (searchEmail.trim()) {
      setActiveEmail(searchEmail.trim());
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const toggleExpanded = (id: string) => {
    setExpandedEmails(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg">Test Emails Viewer</CardTitle>
            <Badge variant="outline" className="text-amber-500 border-amber-500/30">
              Test Mode
            </Badge>
          </div>
          {activeEmail && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
            </Button>
          )}
        </div>
        <CardDescription>
          View emails sent during testing. Enter the test email address used during signup.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search input */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter test email address..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={!searchEmail.trim() || isLoading}>
            {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Search'}
          </Button>
        </div>

        {/* Results */}
        {data && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Found {data.count} email{data.count !== 1 ? 's' : ''} for {data.email}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last 30 min
              </span>
            </div>

            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {data.emails.map((email) => (
                  <Collapsible
                    key={email.id}
                    open={expandedEmails.has(email.id)}
                    onOpenChange={() => toggleExpanded(email.id)}
                  >
                    <Card className="overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0">
                              {email.status === 'sent' ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <Clock className="h-4 w-4 text-amber-500" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{email.subject}</p>
                              <p className="text-xs text-muted-foreground">
                                From: {email.from} • {new Date(email.sentAt).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {email.links.categorized.onboarding.length > 0 && (
                              <Badge variant="default" className="bg-green-600">
                                Onboarding Link
                              </Badge>
                            )}
                            <ChevronDown className={cn(
                              "h-4 w-4 text-muted-foreground transition-transform",
                              expandedEmails.has(email.id) && "rotate-180"
                            )} />
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="border-t p-3 space-y-3 bg-muted/30">
                          {/* Quick Actions for Links */}
                          {email.links.categorized.onboarding.length > 0 && (
                            <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-md">
                              <p className="text-xs font-medium text-green-600 mb-2">🎯 Onboarding Links</p>
                              {email.links.categorized.onboarding.map((link, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <code className="text-xs bg-background px-2 py-1 rounded flex-1 truncate">
                                    {link}
                                  </code>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => copyToClipboard(link, 'Onboarding link')}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => window.open(link, '_blank')}
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* All Links */}
                          {email.links.all.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                <LinkIcon className="h-3 w-3" />
                                All Links ({email.links.all.length})
                              </p>
                              <div className="space-y-1">
                                {email.links.all.slice(0, 5).map((link, idx) => (
                                  <div key={idx} className="flex items-center gap-2 text-xs">
                                    <code className="bg-background px-2 py-0.5 rounded flex-1 truncate text-muted-foreground">
                                      {link}
                                    </code>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0"
                                      onClick={() => copyToClipboard(link, 'Link')}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                                {email.links.all.length > 5 && (
                                  <p className="text-xs text-muted-foreground">
                                    +{email.links.all.length - 5} more links
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Email Body Preview */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">Body Preview</p>
                            <div className="text-xs text-muted-foreground bg-background p-2 rounded max-h-24 overflow-y-auto">
                              {email.bodyText?.substring(0, 500)}
                              {email.bodyText && email.bodyText.length > 500 && '...'}
                            </div>
                          </div>

                          {/* Copy Full Body */}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => copyToClipboard(email.bodyHtml, 'HTML body')}
                            >
                              <Copy className="h-3 w-3 mr-2" />
                              Copy HTML
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => copyToClipboard(email.bodyText, 'Text body')}
                            >
                              <Copy className="h-3 w-3 mr-2" />
                              Copy Text
                            </Button>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}

                {data.emails.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No emails found for this address</p>
                    <p className="text-xs mt-1">Try triggering a signup or action that sends an email</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* API Usage Info */}
        <div className="text-xs text-muted-foreground border-t pt-3">
          <p className="font-medium mb-1">📡 API for Automation:</p>
          <code className="block bg-background p-2 rounded text-[10px] break-all">
            GET /functions/v1/get-test-emails?email=YOUR_EMAIL&minutes=30
          </code>
          <p className="mt-1">Header: <code className="bg-background px-1 rounded">x-test-key: testdriver-ai-2024</code></p>
        </div>
      </CardContent>
    </Card>
  );
}
