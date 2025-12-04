import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAddMediaItem, useUpdateMediaItem, MediaItem } from '@/hooks/useMediaLibrary';
import { toast } from 'sonner';
import { X } from 'lucide-react';

interface MediaLibraryFormProps {
  open: boolean;
  onClose: () => void;
  editingItem: MediaItem | null;
}

const mediaTypes = [
  { value: 'video', label: 'Video' },
  { value: 'document', label: 'Document' },
  { value: 'image', label: 'Image' },
  { value: 'link', label: 'Link' },
];

export function MediaLibraryForm({ open, onClose, editingItem }: MediaLibraryFormProps) {
  const addMediaItem = useAddMediaItem();
  const updateMediaItem = useUpdateMediaItem();

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState<'video' | 'document' | 'image' | 'link'>('video');
  const [description, setDescription] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setUrl(editingItem.url);
      setType(editingItem.type);
      setDescription(editingItem.description || '');
      setKeywords(editingItem.keywords || []);
    } else {
      setName('');
      setUrl('');
      setType('video');
      setDescription('');
      setKeywords([]);
    }
    setKeywordInput('');
  }, [editingItem, open]);

  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim().toLowerCase();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !url.trim()) {
      toast.error('Name and URL are required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await updateMediaItem.mutateAsync({
          id: editingItem.id,
          item: { name, url, type, description: description || null, keywords },
        });
        toast.success('Media item updated');
      } else {
        await addMediaItem.mutateAsync({
          name,
          url,
          type,
          description: description || null,
          keywords,
        });
        toast.success('Media item added');
      }
      onClose();
    } catch (err) {
      toast.error('Failed to save media item');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingItem ? 'Edit Media Item' : 'Add Media Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bathroom Renovation Video"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL *</Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mediaTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this media..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="keywords">Keywords (for AI matching)</Label>
            <div className="flex gap-2">
              <Input
                id="keywords"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="bathroom, renovation, remodel"
              />
              <Button type="button" variant="outline" onClick={handleAddKeyword}>
                Add
              </Button>
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {keywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-muted rounded-full"
                  >
                    {kw}
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(kw)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Keywords help the AI match spoken references like "bathroom video" to this item
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Add Media'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
