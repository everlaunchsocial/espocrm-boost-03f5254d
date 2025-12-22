import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLeadIntents, useBulkUpdateLeadIntents } from '@/hooks/useLeadIntents';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { INTENT_TAGS, getIntentTagConfig } from '@/lib/intentTags';
import { Tag, Search, Loader2, Bot } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LeadIntentEditorProps {
  leadId: string;
  className?: string;
}

export function LeadIntentEditor({ leadId, className }: LeadIntentEditorProps) {
  const { isEnabled } = useFeatureFlags();
  const phase2Enabled = isEnabled('aiCrmPhase2');
  const { data: intents = [], isLoading } = useLeadIntents(leadId);
  const bulkUpdate = useBulkUpdateLeadIntents();
  
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  if (!phase2Enabled) return null;

  const currentTags = new Set(intents.map(i => i.tag));
  const aiTags = new Set(intents.filter(i => i.source === 'ai').map(i => i.tag));

  // Filter tags by search
  const filteredTags = INTENT_TAGS.filter(tag =>
    tag.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tag.value.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setSelectedTags(new Set(currentTags));
      setSearchQuery('');
    }
    setOpen(isOpen);
  };

  const toggleTag = (tagValue: string) => {
    const newSelected = new Set(selectedTags);
    if (newSelected.has(tagValue)) {
      newSelected.delete(tagValue);
    } else {
      if (newSelected.size >= 5) {
        toast.error('Maximum 5 intent tags allowed');
        return;
      }
      newSelected.add(tagValue);
    }
    setSelectedTags(newSelected);
  };

  const handleSave = async () => {
    try {
      await bulkUpdate.mutateAsync({
        leadId,
        tags: Array.from(selectedTags),
      });
      toast.success('Intent tags updated');
      setOpen(false);
    } catch (error) {
      toast.error('Failed to update intent tags');
    }
  };

  const hasChanges = () => {
    if (selectedTags.size !== currentTags.size) return true;
    for (const tag of selectedTags) {
      if (!currentTags.has(tag)) return true;
    }
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={cn('gap-1.5', className)}>
          <Tag className="h-4 w-4" />
          Tag Intent
          {intents.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
              {intents.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Lead Intent Tags
          </DialogTitle>
          <DialogDescription>
            Select up to 5 intent tags to classify this lead.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Tag list */}
          <ScrollArea className="h-[280px] pr-4">
            <div className="space-y-2">
              {filteredTags.map((tag) => {
                const isSelected = selectedTags.has(tag.value);
                const isAiAssigned = aiTags.has(tag.value);
                
                return (
                  <label
                    key={tag.value}
                    className={cn(
                      'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
                      isSelected 
                        ? 'bg-primary/10 border border-primary/20' 
                        : 'hover:bg-muted border border-transparent'
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleTag(tag.value)}
                    />
                    <span className="text-lg">{tag.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{tag.label}</p>
                    </div>
                    {isAiAssigned && isSelected && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Bot className="h-3 w-3" />
                        AI
                      </Badge>
                    )}
                  </label>
                );
              })}

              {filteredTags.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No tags match your search
                </p>
              )}
            </div>
          </ScrollArea>

          {/* Selected count */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{selectedTags.size}/5 tags selected</span>
            {selectedTags.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTags(new Set())}
                className="h-auto py-1 px-2 text-xs"
              >
                Clear all
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={bulkUpdate.isPending || !hasChanges()}
          >
            {bulkUpdate.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Tags
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
