import { useState } from 'react';
import { Check, ChevronDown, Sparkles, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useAllLeadTags } from '@/hooks/useLeadTags';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { cn } from '@/lib/utils';

export type TagFilterMode = 'any' | 'all' | 'exclude';

interface LeadTagFilterProps {
  selectedTags: string[];
  onSelectedTagsChange: (tags: string[]) => void;
  filterMode: TagFilterMode;
  onFilterModeChange: (mode: TagFilterMode) => void;
}

export function LeadTagFilter({
  selectedTags,
  onSelectedTagsChange,
  filterMode,
  onFilterModeChange,
}: LeadTagFilterProps) {
  const { isEnabled } = useFeatureFlags();
  const { data: allTags = [], isLoading } = useAllLeadTags();
  const [open, setOpen] = useState(false);

  if (!isEnabled('aiCrmPhase2')) return null;

  const toggleTag = (tagText: string) => {
    if (selectedTags.includes(tagText)) {
      onSelectedTagsChange(selectedTags.filter(t => t !== tagText));
    } else {
      onSelectedTagsChange([...selectedTags, tagText]);
    }
  };

  const clearAll = () => {
    onSelectedTagsChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 gap-1.5",
            selectedTags.length > 0 && "border-primary text-primary"
          )}
        >
          <Tag className="h-3.5 w-3.5" />
          Tags
          {selectedTags.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {selectedTags.length}
            </Badge>
          )}
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search tags..." />
          <CommandList>
            <CommandEmpty>No tags found.</CommandEmpty>
            <CommandGroup heading="Filter Mode">
              <div className="px-2 py-2">
                <RadioGroup
                  value={filterMode}
                  onValueChange={(v) => onFilterModeChange(v as TagFilterMode)}
                  className="flex gap-3"
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="any" id="any" className="h-3 w-3" />
                    <Label htmlFor="any" className="text-xs cursor-pointer">Has Any</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="all" id="all" className="h-3 w-3" />
                    <Label htmlFor="all" className="text-xs cursor-pointer">Has All</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="exclude" id="exclude" className="h-3 w-3" />
                    <Label htmlFor="exclude" className="text-xs cursor-pointer">Exclude</Label>
                  </div>
                </RadioGroup>
              </div>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Available Tags">
              {isLoading ? (
                <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                  Loading tags...
                </div>
              ) : allTags.length === 0 ? (
                <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                  No tags created yet
                </div>
              ) : (
                allTags.map((tag) => (
                  <CommandItem
                    key={tag.tag_text}
                    value={tag.tag_text}
                    onSelect={() => toggleTag(tag.tag_text)}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <div className={cn(
                        "h-4 w-4 border rounded flex items-center justify-center",
                        selectedTags.includes(tag.tag_text) 
                          ? "bg-primary border-primary" 
                          : "border-input"
                      )}>
                        {selectedTags.includes(tag.tag_text) && (
                          <Check className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>
                      <span className="flex-1 truncate">{tag.tag_text}</span>
                      {tag.is_ai_generated && (
                        <Sparkles className="h-3 w-3 text-amber-500" />
                      )}
                    </div>
                  </CommandItem>
                ))
              )}
            </CommandGroup>
          </CommandList>
          {selectedTags.length > 0 && (
            <>
              <CommandSeparator />
              <div className="p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-7 text-xs"
                  onClick={clearAll}
                >
                  Clear All
                </Button>
              </div>
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
