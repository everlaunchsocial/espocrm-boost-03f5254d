import { useState, useRef } from 'react';
import { useWorkspaceDocuments, WorkspaceDocument } from '@/hooks/useWorkspaceDocuments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  FileImage, 
  FileSpreadsheet, 
  File, 
  Download, 
  Trash2, 
  Search,
  Grid,
  List,
  Loader2,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DocumentViewer } from './DocumentViewer';

function getFileIcon(fileType: string | null) {
  if (!fileType) return File;
  if (fileType.startsWith('image/')) return FileImage;
  if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('csv')) return FileSpreadsheet;
  if (fileType.includes('pdf') || fileType.includes('document') || fileType.includes('text')) return FileText;
  return File;
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsTab() {
  const { documents, isLoading, uploadDocument, deleteDocument } = useWorkspaceDocuments();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isDragging, setIsDragging] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<WorkspaceDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredDocs = documents.filter(doc => 
    doc.name.toLowerCase().includes(search.toLowerCase()) ||
    doc.description?.toLowerCase().includes(search.toLowerCase()) ||
    doc.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      await uploadDocument.mutateAsync({ file });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      await uploadDocument.mutateAsync({ file });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleView = (doc: WorkspaceDocument) => {
    setViewingDoc(doc);
  };

  const handleDownload = (doc: WorkspaceDocument) => {
    const link = document.createElement('a');
    link.href = doc.file_url;
    link.download = doc.name;
    link.click();
  };

  const handleDelete = async (doc: WorkspaceDocument) => {
    if (confirm(`Delete "${doc.name}"? This cannot be undone.`)) {
      await deleteDocument.mutateAsync(doc);
    }
  };

  return (
    <>
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode('grid')}
            className={cn(viewMode === 'grid' && 'bg-muted')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode('list')}
            className={cn(viewMode === 'list' && 'bg-muted')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </div>

      {/* Upload drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          uploadDocument.isPending && "opacity-50 pointer-events-none"
        )}
      >
        {uploadDocument.isPending ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Uploading...
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Drag and drop files here, or click Upload
            </p>
          </>
        )}
      </div>

      {/* Documents */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? 'No documents match your search' : 'No documents yet. Upload your first file!'}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredDocs.map((doc) => {
            const Icon = getFileIcon(doc.file_type);
            const isImage = doc.file_type?.startsWith('image/');
            
            return (
              <Card 
                key={doc.id} 
                className="group hover:border-primary/50 transition-colors overflow-hidden cursor-pointer"
                onClick={() => handleView(doc)}
              >
                <CardContent className="p-3">
                  {/* Preview */}
                  <div className="aspect-square rounded-lg bg-muted flex items-center justify-center mb-3 overflow-hidden relative">
                    {isImage ? (
                      <img 
                        src={doc.file_url} 
                        alt={doc.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Icon className="h-12 w-12 text-muted-foreground" />
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Eye className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  
                  {/* Info */}
                  <p className="font-medium text-sm truncate" title={doc.name}>
                    {doc.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(doc.file_size)} · {format(new Date(doc.created_at), 'MMM d')}
                  </p>
                  
                  {/* Tags */}
                  {doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {doc.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); handleView(doc); }}>
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}>
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-1 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(doc); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDocs.map((doc) => {
            const Icon = getFileIcon(doc.file_type);
            
            return (
              <div 
                key={doc.id} 
                className="flex items-center gap-4 p-3 rounded-lg border hover:border-primary/50 transition-colors group cursor-pointer"
                onClick={() => handleView(doc)}
              >
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(doc.file_size)} · {format(new Date(doc.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                {doc.tags.length > 0 && (
                  <div className="flex gap-1">
                    {doc.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleView(doc); }}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(doc); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
    
    {/* Document Viewer Modal */}
    <DocumentViewer
      document={viewingDoc}
      isOpen={!!viewingDoc}
      onClose={() => setViewingDoc(null)}
    />
    </>
  );
}
