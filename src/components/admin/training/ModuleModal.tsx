import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ModuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: any | null;
  categories: any[];
  onSave: (data: any) => Promise<void>;
}

const contentTypes = [
  { value: 'video', label: 'Video' },
  { value: 'article', label: 'Article' },
  { value: 'pdf', label: 'PDF Document' },
  { value: 'quiz', label: 'Quiz' },
];

export function ModuleModal({ open, onOpenChange, module, categories, onSave }: ModuleModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [contentType, setContentType] = useState('video');
  const [contentUrl, setContentUrl] = useState('');
  const [contentBody, setContentBody] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [sortOrder, setSortOrder] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (module) {
      setTitle(module.title || '');
      setDescription(module.description || '');
      setCategoryId(module.category_id || '');
      setContentType(module.content_type || 'video');
      setContentUrl(module.content_url || '');
      setContentBody(module.content_body || '');
      setDurationMinutes(String(module.duration_minutes || ''));
      setIsRequired(module.is_required || false);
      setIsPublished(module.is_published ?? true);
      setSortOrder(String(module.sort_order || 0));
    } else {
      setTitle('');
      setDescription('');
      setCategoryId('');
      setContentType('video');
      setContentUrl('');
      setContentBody('');
      setDurationMinutes('');
      setIsRequired(false);
      setIsPublished(true);
      setSortOrder('0');
    }
  }, [module, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        category_id: categoryId || null,
        content_type: contentType,
        content_url: contentUrl.trim() || null,
        content_body: contentBody.trim() || null,
        duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
        is_required: isRequired,
        is_published: isPublished,
        sort_order: parseInt(sortOrder) || 0,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{module ? 'Edit Module' : 'Create Module'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Introduction to EverLaunch"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this module covers..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Uncategorized</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Content Type</Label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(contentType === 'video' || contentType === 'pdf') && (
            <div className="space-y-2">
              <Label htmlFor="contentUrl">
                {contentType === 'video' ? 'Video URL' : 'PDF URL'}
              </Label>
              <Input
                id="contentUrl"
                value={contentUrl}
                onChange={(e) => setContentUrl(e.target.value)}
                placeholder={
                  contentType === 'video'
                    ? 'https://youtube.com/watch?v=... or https://vimeo.com/...'
                    : 'https://example.com/document.pdf'
                }
              />
              <p className="text-xs text-muted-foreground">
                {contentType === 'video'
                  ? 'Supports YouTube, Vimeo, or direct video URLs'
                  : 'Direct link to the PDF file'}
              </p>
            </div>
          )}

          {contentType === 'article' && (
            <div className="space-y-2">
              <Label htmlFor="contentBody">Article Content</Label>
              <Textarea
                id="contentBody"
                value={contentBody}
                onChange={(e) => setContentBody(e.target.value)}
                placeholder="Enter the article content here... (HTML supported)"
                rows={8}
              />
              <p className="text-xs text-muted-foreground">
                You can use basic HTML for formatting (headings, paragraphs, lists, links)
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                placeholder="e.g., 15"
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sortOrder">Display Order</Label>
              <Input
                id="sortOrder"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                min="0"
              />
            </div>
          </div>

          <div className="flex items-center gap-6 pt-2">
            <div className="flex items-center gap-2">
              <Switch
                id="required"
                checked={isRequired}
                onCheckedChange={setIsRequired}
              />
              <Label htmlFor="required" className="font-normal">
                Required module
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="published"
                checked={isPublished}
                onCheckedChange={setIsPublished}
              />
              <Label htmlFor="published" className="font-normal">
                Published (visible to affiliates)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? 'Saving...' : module ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
