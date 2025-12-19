import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, X, FileText, File } from 'lucide-react';
import type { WorkspaceDocument } from '@/hooks/useWorkspaceDocuments';

interface DocumentViewerProps {
  document: WorkspaceDocument | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentViewer({ document, isOpen, onClose }: DocumentViewerProps) {
  if (!document) return null;

  const fileType = document.file_type?.toLowerCase() || '';
  const isPdf = fileType.includes('pdf');
  const isImage = fileType.includes('image');
  const isGoogleDoc = document.file_url.includes('docs.google.com');
  const isOfficeDoc = fileType.includes('word') || 
                      fileType.includes('document') || 
                      document.name.endsWith('.docx') || 
                      document.name.endsWith('.doc');
  const isSpreadsheet = fileType.includes('spreadsheet') || 
                        fileType.includes('excel') ||
                        document.name.endsWith('.xlsx') ||
                        document.name.endsWith('.xls');
  const isPresentation = fileType.includes('presentation') ||
                         fileType.includes('powerpoint') ||
                         document.name.endsWith('.pptx') ||
                         document.name.endsWith('.ppt');

  // Use Google Docs Viewer for Office documents
  const useGoogleViewer = isOfficeDoc || isSpreadsheet || isPresentation;
  const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(document.file_url)}&embedded=true`;

  const canPreview = isPdf || isImage || isGoogleDoc || useGoogleViewer;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              {document.name}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(document.file_url, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Open
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a href={document.file_url} download={document.name}>
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </a>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-muted/30">
          {isPdf && (
            <iframe
              src={document.file_url}
              className="w-full h-full border-0"
              title={document.name}
            />
          )}
          
          {isImage && (
            <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
              <img
                src={document.file_url}
                alt={document.name}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}

          {isGoogleDoc && (
            <iframe
              src={document.file_url.replace('/edit', '/preview')}
              className="w-full h-full border-0"
              title={document.name}
            />
          )}

          {useGoogleViewer && !isGoogleDoc && (
            <iframe
              src={googleViewerUrl}
              className="w-full h-full border-0"
              title={document.name}
            />
          )}

          {!canPreview && (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8">
              <File className="h-16 w-16 text-muted-foreground" />
              <div className="text-center">
                <h3 className="font-medium text-lg">Preview not available</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This file type cannot be previewed directly. 
                  <br />
                  Download it to view on your computer.
                </p>
              </div>
              <Button asChild>
                <a href={document.file_url} download={document.name}>
                  <Download className="h-4 w-4 mr-2" />
                  Download File
                </a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}