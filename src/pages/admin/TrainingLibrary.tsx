import { useState } from 'react';
import { useTrainingLibrary } from '@/hooks/useTrainingLibrary';
import { TrainingLibraryEntry, TrainingType, TRAINING_TYPE_LABELS, TRAINING_TYPE_COLORS } from '@/types/trainingLibrary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  Search,
  FileText,
  BookOpen,
  ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const TRAINING_TYPES: TrainingType[] = ['core', 'advanced', 'bridge_play', 'product', 'process', 'objection', 'generic'];

// Helper to generate slug from title
function generateSlug(title: string, version: number = 1): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim() + `-v${version}`;
}

interface FormData {
  title: string;
  slug: string;
  training_type: TrainingType;
  vertical_key: string;
  script: string;
  why_priority: string[];
  pain_points: string[];
  why_phone_ai_fits: string[];
  where_to_find: string[];
  script_version: number;
  is_active: boolean;
}

const defaultFormData: FormData = {
  title: '',
  slug: '',
  training_type: 'core',
  vertical_key: '',
  script: '',
  why_priority: [],
  pain_points: [],
  why_phone_ai_fits: [],
  where_to_find: [],
  script_version: 1,
  is_active: true,
};

export default function TrainingLibrary() {
  const { entries, isLoading, createEntry, updateEntry, deleteEntry, toggleActive } = useTrainingLibrary();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TrainingLibraryEntry | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultFormData);

  // Array input states (comma-separated text for simplicity)
  const [whyPriorityText, setWhyPriorityText] = useState('');
  const [painPointsText, setPainPointsText] = useState('');
  const [whyFitsText, setWhyFitsText] = useState('');
  const [whereToFindText, setWhereToFindText] = useState('');

  // Filter entries
  const filteredEntries = entries.filter((entry) => {
    if (typeFilter !== 'all' && entry.training_type !== typeFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        entry.title.toLowerCase().includes(query) ||
        entry.vertical_key?.toLowerCase().includes(query) ||
        entry.slug.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Group entries by vertical_key
  const groupedEntries = filteredEntries.reduce((acc, entry) => {
    const key = entry.vertical_key || '__general__';
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {} as Record<string, TrainingLibraryEntry[]>);

  const openCreateModal = () => {
    setEditingEntry(null);
    setFormData(defaultFormData);
    setWhyPriorityText('');
    setPainPointsText('');
    setWhyFitsText('');
    setWhereToFindText('');
    setIsModalOpen(true);
  };

  const openEditModal = (entry: TrainingLibraryEntry) => {
    setEditingEntry(entry);
    setFormData({
      title: entry.title,
      slug: entry.slug,
      training_type: entry.training_type,
      vertical_key: entry.vertical_key || '',
      script: entry.script,
      why_priority: entry.why_priority,
      pain_points: entry.pain_points,
      why_phone_ai_fits: entry.why_phone_ai_fits,
      where_to_find: entry.where_to_find,
      script_version: entry.script_version,
      is_active: entry.is_active,
    });
    setWhyPriorityText(entry.why_priority.join('\n'));
    setPainPointsText(entry.pain_points.join('\n'));
    setWhyFitsText(entry.why_phone_ai_fits.join('\n'));
    setWhereToFindText(entry.where_to_find.join('\n'));
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const data = {
      ...formData,
      vertical_key: formData.vertical_key || null,
      why_priority: whyPriorityText.split('\n').map(s => s.trim()).filter(Boolean),
      pain_points: painPointsText.split('\n').map(s => s.trim()).filter(Boolean),
      why_phone_ai_fits: whyFitsText.split('\n').map(s => s.trim()).filter(Boolean),
      where_to_find: whereToFindText.split('\n').map(s => s.trim()).filter(Boolean),
    };

    if (editingEntry) {
      await updateEntry.mutateAsync({ id: editingEntry.id, ...data });
    } else {
      await createEntry.mutateAsync(data);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteEntry.mutateAsync(id);
    setDeleteConfirm(null);
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: editingEntry ? prev.slug : generateSlug(title, prev.script_version),
    }));
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Training Library</h1>
          <p className="text-muted-foreground">
            Central source of truth for all training content ({entries.length} entries)
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/admin/training-videos">
              <FileText className="h-4 w-4 mr-2" />
              Generate Videos
            </Link>
          </Button>
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-2" />
            Add Training
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, vertical, or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {TRAINING_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {TRAINING_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Entries grouped by vertical */}
      {Object.keys(groupedEntries).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No training entries found.</p>
            <Button variant="outline" className="mt-4" onClick={openCreateModal}>
              <Plus className="h-4 w-4 mr-2" />
              Create your first training
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" defaultValue={Object.keys(groupedEntries)} className="space-y-2">
          {Object.entries(groupedEntries)
            .sort(([a], [b]) => {
              if (a === '__general__') return 1;
              if (b === '__general__') return -1;
              return a.localeCompare(b);
            })
            .map(([verticalKey, verticalEntries]) => (
              <AccordionItem key={verticalKey} value={verticalKey} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold capitalize">
                      {verticalKey === '__general__' ? 'General Trainings' : verticalKey.replace(/-/g, ' ')}
                    </span>
                    <Badge variant="secondary">{verticalEntries.length}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 py-2">
                    {verticalEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                          entry.is_active ? 'bg-card' : 'bg-muted/50 opacity-60'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{entry.title}</p>
                            <Badge className={TRAINING_TYPE_COLORS[entry.training_type]}>
                              {TRAINING_TYPE_LABELS[entry.training_type]}
                            </Badge>
                            <span className="text-xs text-muted-foreground">v{entry.script_version}</span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {entry.slug} • {entry.script.split(/\s+/).length} words
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch
                            checked={entry.is_active}
                            onCheckedChange={(checked) => toggleActive.mutate({ id: entry.id, is_active: checked })}
                          />
                          <Button variant="ghost" size="icon" onClick={() => openEditModal(entry)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirm(entry.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
        </Accordion>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEntry ? 'Edit Training Entry' : 'Create Training Entry'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Title</Label>
                <Input
                  placeholder="e.g., Core Training — Plumbing"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                />
              </div>

              <div>
                <Label>Slug (auto-generated)</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="core-plumbing-v1"
                />
              </div>

              <div>
                <Label>Version</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.script_version}
                  onChange={(e) => setFormData(prev => ({ ...prev, script_version: parseInt(e.target.value) || 1 }))}
                />
              </div>

              <div>
                <Label>Training Type</Label>
                <Select
                  value={formData.training_type}
                  onValueChange={(val: TrainingType) => setFormData(prev => ({ ...prev, training_type: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRAINING_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {TRAINING_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Vertical Key (optional)</Label>
                <Input
                  placeholder="e.g., plumbing, hvac, dental"
                  value={formData.vertical_key}
                  onChange={(e) => setFormData(prev => ({ ...prev, vertical_key: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">Leave empty for non-vertical trainings</p>
              </div>
            </div>

            <div>
              <Label>Script</Label>
              <Textarea
                placeholder="Enter the full training script..."
                value={formData.script}
                onChange={(e) => setFormData(prev => ({ ...prev, script: e.target.value }))}
                rows={8}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.script.split(/\s+/).filter(Boolean).length} words
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Why Priority (one per line)</Label>
                <Textarea
                  placeholder="High call volume during emergencies&#10;24/7 availability is critical"
                  value={whyPriorityText}
                  onChange={(e) => setWhyPriorityText(e.target.value)}
                  rows={4}
                />
              </div>

              <div>
                <Label>Pain Points (one per line)</Label>
                <Textarea
                  placeholder="After-hours calls go to voicemail&#10;Staff overwhelmed during peak times"
                  value={painPointsText}
                  onChange={(e) => setPainPointsText(e.target.value)}
                  rows={4}
                />
              </div>

              <div>
                <Label>Why Phone AI Fits (one per line)</Label>
                <Textarea
                  placeholder="Never misses emergency calls&#10;Books appointments 24/7"
                  value={whyFitsText}
                  onChange={(e) => setWhyFitsText(e.target.value)}
                  rows={4}
                />
              </div>

              <div>
                <Label>Where to Find (one per line)</Label>
                <Textarea
                  placeholder="Local Facebook groups&#10;Trade shows&#10;BNI networking"
                  value={whereToFindText}
                  onChange={(e) => setWhereToFindText(e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label>Active (visible to affiliates)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.title || !formData.slug || !formData.script || createEntry.isPending || updateEntry.isPending}
            >
              {(createEntry.isPending || updateEntry.isPending) ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {editingEntry ? 'Save Changes' : 'Create Training'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Training Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the training entry and any linked videos will become orphaned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
