import { useState } from 'react';
import { Plus, Pencil, Trash2, GripVertical, Video, FileText, File, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAdminTraining } from '@/hooks/useAdminTraining';
import { CategoryModal } from '@/components/admin/training/CategoryModal';
import { ModuleModal } from '@/components/admin/training/ModuleModal';
import { toast } from 'sonner';
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

const contentTypeIcons: Record<string, typeof Video> = {
  video: Video,
  article: FileText,
  pdf: File,
  quiz: HelpCircle,
};

export default function AdminTraining() {
  const {
    categories,
    modules,
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    createModule,
    updateModule,
    deleteModule,
  } = useAdminTraining();

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingModule, setEditingModule] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'category' | 'module'; id: string; name: string } | null>(null);

  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    setCategoryModalOpen(true);
  };

  const handleEditModule = (module: any) => {
    setEditingModule(module);
    setModuleModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    
    try {
      if (deleteConfirm.type === 'category') {
        await deleteCategory(deleteConfirm.id);
        toast.success('Category deleted');
      } else {
        await deleteModule(deleteConfirm.id);
        toast.success('Module deleted');
      }
    } catch (error) {
      toast.error('Failed to delete');
    }
    setDeleteConfirm(null);
  };

  const handleTogglePublished = async (module: any) => {
    try {
      await updateModule(module.id, { is_published: !module.is_published });
      toast.success(module.is_published ? 'Module unpublished' : 'Module published');
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Uncategorized';
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Training Management</h1>
        <p className="text-muted-foreground">Manage training categories and modules for affiliates</p>
      </div>

      <Tabs defaultValue="modules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="modules">Modules ({modules.length})</TabsTrigger>
          <TabsTrigger value="categories">Categories ({categories.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="modules" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingModule(null); setModuleModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Module
            </Button>
          </div>

          {modules.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Video className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No training modules yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first training module to help affiliates learn about the platform.
                </p>
                <Button onClick={() => { setEditingModule(null); setModuleModalOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Module
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {modules.map((module) => {
                    const ContentIcon = contentTypeIcons[module.content_type] || Video;
                    return (
                      <div key={module.id} className="flex items-center gap-4 p-4 hover:bg-muted/50">
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <ContentIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-foreground truncate">{module.title}</h4>
                            {module.is_required && (
                              <Badge variant="secondary" className="text-xs">Required</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {getCategoryName(module.category_id)} • {module.duration_minutes || 0} min
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Published</span>
                            <Switch
                              checked={module.is_published}
                              onCheckedChange={() => handleTogglePublished(module)}
                            />
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleEditModule(module)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirm({ type: 'module', id: module.id, name: module.title })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingCategory(null); setCategoryModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </div>

          {categories.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No categories yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Categories help organize training modules into logical groups.
                </p>
                <Button onClick={() => { setEditingCategory(null); setCategoryModalOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Category
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => {
                const moduleCount = modules.filter(m => m.category_id === category.id).length;
                return (
                  <Card key={category.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">
                            {category.icon || '📚'}
                          </div>
                          <div>
                            <CardTitle className="text-base">{category.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">{moduleCount} modules</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditCategory(category)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirm({ type: 'category', id: category.id, name: category.name })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    {category.description && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-2">{category.description}</p>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Category Modal */}
      <CategoryModal
        open={categoryModalOpen}
        onOpenChange={setCategoryModalOpen}
        category={editingCategory}
        onSave={async (data) => {
          if (editingCategory) {
            await updateCategory(editingCategory.id, data);
            toast.success('Category updated');
          } else {
            await createCategory(data);
            toast.success('Category created');
          }
          setCategoryModalOpen(false);
          setEditingCategory(null);
        }}
      />

      {/* Module Modal */}
      <ModuleModal
        open={moduleModalOpen}
        onOpenChange={setModuleModalOpen}
        module={editingModule}
        categories={categories}
        onSave={async (data) => {
          if (editingModule) {
            await updateModule(editingModule.id, data);
            toast.success('Module updated');
          } else {
            await createModule(data);
            toast.success('Module created');
          }
          setModuleModalOpen(false);
          setEditingModule(null);
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteConfirm?.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
