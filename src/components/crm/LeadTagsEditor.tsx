import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { useLeadTags, SUGGESTED_TAGS } from '@/hooks/useLeadTags';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { toast } from 'sonner';

interface LeadTagsEditorProps {
  leadId: string;
}

export function LeadTagsEditor({ leadId }: LeadTagsEditorProps) {
  const { isEnabled } = useFeatureFlags();
  const { tags, isLoading, addTag, removeTag } = useLeadTags(leadId);
  const [newTag, setNewTag] = useState('');
  const [popoverOpen, setPopoverOpen] = useState(false);

  if (!isEnabled('aiCrmPhase2')) return null;

  const handleAddTag = async (tagText: string) => {
    if (!tagText.trim()) return;
    if (tags.some(t => t.tag_text === tagText.trim())) {
      toast.error('Tag already exists');
      return;
    }
    try {
      await addTag.mutateAsync(tagText);
      setNewTag('');
      toast.success('Tag added');
    } catch (error) {
      toast.error('Failed to add tag');
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      await removeTag.mutateAsync(tagId);
      toast.success('Tag removed');
    } catch (error) {
      toast.error('Failed to remove tag');
    }
  };

  const existingTagTexts = tags.map(t => t.tag_text);
  const availableSuggestions = SUGGESTED_TAGS.filter(t => !existingTagTexts.includes(t));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <Badge
          key={tag.id}
          variant="secondary"
          className="gap-1 pr-1 text-xs"
        >
          {tag.tag_text}
          <button
            onClick={() => handleRemoveTag(tag.id)}
            className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
            disabled={removeTag.isPending}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <div className="space-y-2">
            <div className="flex gap-1">
              <Input
                placeholder="New tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddTag(newTag);
                  }
                }}
                className="h-8 text-sm"
              />
              <Button
                size="sm"
                className="h-8"
                onClick={() => handleAddTag(newTag)}
                disabled={addTag.isPending || !newTag.trim()}
              >
                Add
              </Button>
            </div>
            
            {availableSuggestions.length > 0 && (
              <div className="border-t pt-2">
                <p className="text-xs text-muted-foreground mb-1.5">Suggestions</p>
                <div className="flex flex-wrap gap-1">
                  {availableSuggestions.slice(0, 6).map((suggestion) => (
                    <Badge
                      key={suggestion}
                      variant="outline"
                      className="cursor-pointer hover:bg-accent text-xs"
                      onClick={() => {
                        handleAddTag(suggestion);
                      }}
                    >
                      {suggestion}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
