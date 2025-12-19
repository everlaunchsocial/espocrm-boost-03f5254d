import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, FileText, History, AlertCircle, Check, Pencil, Trash2 } from 'lucide-react';
import { usePromptLibrary, PromptTemplate, USE_CASE_LABELS, UseCase } from '@/hooks/usePromptLibrary';
import { verticalConfig, VerticalKey } from '@/lib/verticalConfig';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const VERTICAL_COLORS: Record<string, string> = {
  'universal': 'border-l-blue-500',
  'dentist': 'border-l-cyan-500',
  'home-improvement': 'border-l-orange-500',
  'hvac': 'border-l-red-500',
  'legal': 'border-l-purple-500',
  'real-estate': 'border-l-green-500',
  'pest-control': 'border-l-yellow-500',
  'network-marketing': 'border-l-pink-500',
  'med-spa': 'border-l-rose-500',
};

const getCategoryName = (category: string): string => {
  if (category === 'universal') return 'Universal Prompts';
  const vertical = verticalConfig[category as VerticalKey];
  return vertical?.name || category;
};

export function PromptLibraryTab() {
  const {
    promptsByCategory,
    categories,
    isLoading,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    createPrompt,
    updatePrompt,
    createNewVersion,
    deletePrompt,
  } = usePromptLibrary();

  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editResearchNotes, setEditResearchNotes] = useState('');
  const [newPromptForm, setNewPromptForm] = useState({
    name: '',
    category: 'universal',
    use_case: 'system_prompt' as UseCase,
    prompt_content: '',
    research_notes: '',
  });

  const handleOpenPrompt = (prompt: PromptTemplate) => {
    setSelectedPrompt(prompt);
    setEditContent(prompt.prompt_content);
    setEditResearchNotes(prompt.research_notes || '');
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedPrompt) return;
    
    if (editContent !== selectedPrompt.prompt_content) {
      // Content changed - create new version
      await createNewVersion(selectedPrompt, editContent, editResearchNotes);
    } else if (editResearchNotes !== (selectedPrompt.research_notes || '')) {
      // Only research notes changed - update in place
      await updatePrompt(selectedPrompt.id, { research_notes: editResearchNotes });
    }
    
    setSelectedPrompt(null);
    setIsEditing(false);
  };

  const handleCreatePrompt = async () => {
    await createPrompt({
      name: newPromptForm.name,
      category: newPromptForm.category,
      use_case: newPromptForm.use_case,
      prompt_content: newPromptForm.prompt_content,
      variables: [],
      version: 1,
      is_active: true,
      parent_version_id: null,
      research_notes: newPromptForm.research_notes || null,
    });
    setIsCreating(false);
    setNewPromptForm({
      name: '',
      category: 'universal',
      use_case: 'system_prompt',
      prompt_content: '',
      research_notes: '',
    });
  };

  const handleDeletePrompt = async (prompt: PromptTemplate) => {
    if (confirm(`Delete "${prompt.name}"?`)) {
      await deletePrompt(prompt.id);
      setSelectedPrompt(null);
    }
  };

  // Sort categories with universal first
  const sortedCategories = ['universal', ...categories.filter(c => c !== 'universal').sort()];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search prompts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedCategory || 'all'} onValueChange={(v) => setSelectedCategory(v === 'all' ? null : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {sortedCategories.filter(c => categories.includes(c)).map((cat) => (
              <SelectItem key={cat} value={cat}>{getCategoryName(cat)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Prompt
        </Button>
      </div>

      {/* Accordion by Category */}
      {Object.keys(promptsByCategory).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No prompts found. Create your first prompt to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" defaultValue={sortedCategories} className="space-y-2">
          {sortedCategories.map((category) => {
            const categoryPrompts = promptsByCategory[category];
            if (!categoryPrompts?.length) return null;

            return (
              <AccordionItem
                key={category}
                value={category}
                className={cn(
                  'border rounded-lg bg-card border-l-4',
                  VERTICAL_COLORS[category] || 'border-l-muted'
                )}
              >
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{getCategoryName(category)}</span>
                    <Badge variant="secondary" className="text-xs">
                      {categoryPrompts.length} prompt{categoryPrompts.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="grid gap-2">
                    {categoryPrompts.map((prompt) => (
                      <button
                        key={prompt.id}
                        onClick={() => handleOpenPrompt(prompt)}
                        className="text-left p-3 rounded-md hover:bg-muted/50 border flex items-start gap-3 transition-colors"
                      >
                        <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{prompt.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {USE_CASE_LABELS[prompt.use_case as UseCase] || prompt.use_case}
                            </Badge>
                            {prompt.version > 1 && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <History className="h-3 w-3" />
                                v{prompt.version}
                              </Badge>
                            )}
                            {prompt.is_active && (
                              <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/50">
                                <Check className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            )}
                            {prompt.research_notes && (
                              <Badge variant="outline" className="text-xs text-amber-400 border-amber-500/50">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Research
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {prompt.prompt_content.substring(0, 150)}...
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Prompt Viewer/Editor Modal */}
      <Dialog open={!!selectedPrompt} onOpenChange={() => setSelectedPrompt(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedPrompt && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="flex items-center gap-2">
                    {selectedPrompt.name}
                    {selectedPrompt.version > 1 && (
                      <Badge variant="secondary">v{selectedPrompt.version}</Badge>
                    )}
                  </DialogTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      {isEditing ? 'Cancel' : 'Edit'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePrompt(selectedPrompt)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <Badge>{getCategoryName(selectedPrompt.category)}</Badge>
                  <Badge variant="outline">
                    {USE_CASE_LABELS[selectedPrompt.use_case as UseCase] || selectedPrompt.use_case}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div>
                  <Label>Prompt Content</Label>
                  {isEditing ? (
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="mt-1.5 min-h-[300px] font-mono text-sm"
                    />
                  ) : (
                    <div className="mt-1.5 p-3 rounded-md bg-muted/50 border min-h-[300px] whitespace-pre-wrap font-mono text-sm">
                      {selectedPrompt.prompt_content}
                    </div>
                  )}
                </div>

                {/* Research Notes Section */}
                <div className="border-t pt-4">
                  <Label className="flex items-center gap-2 text-amber-400">
                    <AlertCircle className="h-4 w-4" />
                    Research Notes
                  </Label>
                  {isEditing ? (
                    <Textarea
                      value={editResearchNotes}
                      onChange={(e) => setEditResearchNotes(e.target.value)}
                      placeholder="Add research notes, references to documents, or improvement ideas..."
                      className="mt-1.5 min-h-[100px] border-amber-500/30"
                    />
                  ) : selectedPrompt.research_notes ? (
                    <div className="mt-1.5 p-3 rounded-md bg-amber-500/10 border border-amber-500/30 whitespace-pre-wrap text-sm">
                      {selectedPrompt.research_notes}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1.5">No research notes</p>
                  )}
                </div>

                {/* Version Info */}
                {selectedPrompt.version > 1 && (
                  <div className="text-xs text-muted-foreground">
                    Version {selectedPrompt.version} • Last updated {new Date(selectedPrompt.updated_at).toLocaleDateString()}
                  </div>
                )}
              </div>

              {isEditing && (
                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEdit}>
                    {editContent !== selectedPrompt.prompt_content ? 'Save as New Version' : 'Save Changes'}
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create New Prompt Modal */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Prompt</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label>Name</Label>
              <Input
                value={newPromptForm.name}
                onChange={(e) => setNewPromptForm({ ...newPromptForm, name: e.target.value })}
                placeholder="e.g., Med Spa System Prompt"
                className="mt-1.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category / Vertical</Label>
                <Select
                  value={newPromptForm.category}
                  onValueChange={(v) => setNewPromptForm({ ...newPromptForm, category: v })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="universal">Universal</SelectItem>
                    {Object.keys(verticalConfig).map((key) => (
                      <SelectItem key={key} value={key}>
                        {verticalConfig[key as VerticalKey].name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Use Case</Label>
                <Select
                  value={newPromptForm.use_case}
                  onValueChange={(v) => setNewPromptForm({ ...newPromptForm, use_case: v as UseCase })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(USE_CASE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Prompt Content</Label>
              <Textarea
                value={newPromptForm.prompt_content}
                onChange={(e) => setNewPromptForm({ ...newPromptForm, prompt_content: e.target.value })}
                placeholder="Enter the prompt content..."
                className="mt-1.5 min-h-[200px] font-mono text-sm"
              />
            </div>

            <div>
              <Label className="text-amber-400">Research Notes (optional)</Label>
              <Textarea
                value={newPromptForm.research_notes}
                onChange={(e) => setNewPromptForm({ ...newPromptForm, research_notes: e.target.value })}
                placeholder="Add research notes, references, or improvement ideas..."
                className="mt-1.5 min-h-[80px] border-amber-500/30"
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreatePrompt}
              disabled={!newPromptForm.name || !newPromptForm.prompt_content}
            >
              Create Prompt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
