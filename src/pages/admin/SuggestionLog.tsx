import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSuggestionLog } from '@/hooks/useSuggestionLog';
import { Copy, Trash2, Download, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function SuggestionLog() {
  const { suggestions, isLoading, clearLog, exportForChatGPT, isClearing } = useSuggestionLog();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = exportForChatGPT();
    if (!text) {
      toast.error('No suggestions to copy');
      return;
    }
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard - paste into ChatGPT!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    if (confirm('Clear all logged suggestions? This cannot be undone.')) {
      clearLog();
      toast.success('Suggestion log cleared');
    }
  };

  const handleDownload = () => {
    const text = exportForChatGPT();
    if (!text) {
      toast.error('No suggestions to download');
      return;
    }
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `suggestions-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-yellow-500" />
            Suggestion Log
          </h1>
          <p className="text-muted-foreground">
            Feature suggestions captured during AI sessions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownload} disabled={suggestions.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button onClick={handleCopy} disabled={suggestions.length === 0}>
            <Copy className="h-4 w-4 mr-2" />
            {copied ? 'Copied!' : 'Copy for ChatGPT'}
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleClear} 
            disabled={suggestions.length === 0 || isClearing}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {suggestions.length} Suggestion{suggestions.length !== 1 ? 's' : ''} Logged
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : suggestions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No suggestions logged yet. They'll appear here as you build!
            </p>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {suggestions.map((s) => (
                  <div 
                    key={s.id} 
                    className="p-3 border rounded-lg bg-muted/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{s.suggestion_text}</p>
                      {s.category && (
                        <Badge variant="secondary">{s.category}</Badge>
                      )}
                    </div>
                    {s.context && (
                      <p className="text-sm text-muted-foreground mt-1">{s.context}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(s.created_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
