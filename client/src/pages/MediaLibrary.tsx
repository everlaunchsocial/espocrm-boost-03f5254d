import { useState } from 'react';
import { useMediaLibrary, useDeleteMediaItem, MediaItem } from '@/hooks/useMediaLibrary';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/crm/DataTable';
import { MediaLibraryForm } from '@/components/crm/MediaLibraryForm';
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
import { Plus, Pencil, Trash2, Video, FileText, Image, Link, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const typeIcons = {
  video: Video,
  document: FileText,
  image: Image,
  link: Link,
};

export default function MediaLibrary() {
  const { data: mediaItems = [], isLoading } = useMediaLibrary();
  const deleteMediaItem = useDeleteMediaItem();

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MediaItem | null>(null);

  const handleCreate = () => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleEdit = (item: MediaItem) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleDeleteClick = (item: MediaItem) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (itemToDelete) {
      await deleteMediaItem.mutateAsync(itemToDelete.id);
      toast.success('Media item deleted');
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const columns = [
    {
      key: 'type',
      label: 'Type',
      render: (item: MediaItem) => {
        const Icon = typeIcons[item.type] || Link;
        return (
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="capitalize">{item.type}</span>
          </div>
        );
      },
    },
    {
      key: 'name',
      label: 'Name',
      render: (item: MediaItem) => (
        <div>
          <p className="font-medium">{item.name}</p>
          {item.description && (
            <p className="text-sm text-muted-foreground truncate max-w-xs">
              {item.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'url',
      label: 'URL',
      render: (item: MediaItem) => (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-primary hover:underline text-sm max-w-xs truncate"
        >
          {item.url}
          <ExternalLink className="h-3 w-3 flex-shrink-0" />
        </a>
      ),
    },
    {
      key: 'keywords',
      label: 'Keywords',
      render: (item: MediaItem) => (
        <div className="flex flex-wrap gap-1">
          {item.keywords.slice(0, 3).map((kw, i) => (
            <span
              key={i}
              className="px-2 py-0.5 text-xs bg-muted rounded-full"
            >
              {kw}
            </span>
          ))}
          {item.keywords.length > 3 && (
            <span className="px-2 py-0.5 text-xs text-muted-foreground">
              +{item.keywords.length - 3} more
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      label: 'Added',
      render: (item: MediaItem) => (
        <span className="text-sm text-muted-foreground">
          {format(item.createdAt, 'MMM d, yyyy')}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (item: MediaItem) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDeleteClick(item)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Media Library</h1>
          <p className="text-muted-foreground">
            Manage videos, documents, and links for the Call Assistant to reference
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Media
        </Button>
      </div>

      <DataTable
        data={mediaItems}
        columns={columns}
        searchKeys={['name' as keyof MediaItem]}
        searchPlaceholder="Search media..."
      />

      <MediaLibraryForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingItem(null);
        }}
        editingItem={editingItem}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Media Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
