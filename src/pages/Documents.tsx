import { useState } from 'react';
import { 
  FileText, Upload, Plus, Search, Filter, Download, 
  Send, Eye, Clock, CheckCircle, XCircle, AlertCircle,
  FileSignature, MoreVertical, Trash2, ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import {
  useDocuments,
  useDocumentTemplates,
  useDocumentStats,
  useGenerateDocument,
  useUploadDocument,
  useUpdateDocumentStatus,
  useDeleteDocument,
  Document,
  DocumentTemplate,
  getStatusBadgeVariant,
  getDocumentTypeIcon,
  formatFileSize,
} from '@/hooks/useDocuments';

export default function Documents() {
  // Simple leads fetch for dropdown
  const { data: leadsData = [] } = useDocuments();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const { data: documents = [], isLoading } = useDocuments({ 
    status: statusFilter !== 'all' ? statusFilter : undefined,
    type: typeFilter !== 'all' ? typeFilter : undefined,
  });
  const { data: stats } = useDocumentStats();
  const { data: templates = [] } = useDocumentTemplates();
  const leads: any[] = []; // Leads would be fetched separately if needed

  const deleteDocument = useDeleteDocument();
  const updateStatus = useUpdateDocumentStatus();

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.related_to_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingSignature = filteredDocuments.filter(d => d.status === 'sent' || d.status === 'viewed');
  const signed = filteredDocuments.filter(d => d.status === 'signed');
  const drafts = filteredDocuments.filter(d => d.status === 'draft');
  const declined = filteredDocuments.filter(d => d.status === 'declined' || d.status === 'expired');

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground">Manage contracts, proposals, and e-signatures</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowUploadModal(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
          <Button onClick={() => setShowGenerateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            From Template
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-muted-foreground">{stats?.draft || 0}</div>
            <div className="text-xs text-muted-foreground">Drafts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats?.sent || 0}</div>
            <div className="text-xs text-muted-foreground">Sent</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats?.viewed || 0}</div>
            <div className="text-xs text-muted-foreground">Viewed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats?.signed || 0}</div>
            <div className="text-xs text-muted-foreground">Signed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{(stats?.declined || 0) + (stats?.expired || 0)}</div>
            <div className="text-xs text-muted-foreground">Declined/Expired</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{stats?.signatureRate || 0}%</div>
            <div className="text-xs text-muted-foreground">Sign Rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="viewed">Viewed</SelectItem>
            <SelectItem value="signed">Signed</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="contract">Contract</SelectItem>
            <SelectItem value="proposal">Proposal</SelectItem>
            <SelectItem value="nda">NDA</SelectItem>
            <SelectItem value="quote">Quote</SelectItem>
            <SelectItem value="invoice">Invoice</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Document List */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Signature ({pendingSignature.length})
          </TabsTrigger>
          <TabsTrigger value="signed">
            Signed ({signed.length})
          </TabsTrigger>
          <TabsTrigger value="drafts">
            Drafts ({drafts.length})
          </TabsTrigger>
          <TabsTrigger value="declined">
            Declined/Expired ({declined.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingSignature.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No documents pending signature</p>
              </CardContent>
            </Card>
          ) : (
            pendingSignature.map(doc => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onSelect={() => setSelectedDocument(doc)}
                onDelete={() => deleteDocument.mutate(doc.id)}
                onResend={() => updateStatus.mutate({ id: doc.id, status: 'sent', sent_at: new Date().toISOString() })}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="signed" className="space-y-4">
          {signed.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No signed documents yet</p>
              </CardContent>
            </Card>
          ) : (
            signed.map(doc => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onSelect={() => setSelectedDocument(doc)}
                onDelete={() => deleteDocument.mutate(doc.id)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="drafts" className="space-y-4">
          {drafts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No draft documents</p>
              </CardContent>
            </Card>
          ) : (
            drafts.map(doc => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onSelect={() => setSelectedDocument(doc)}
                onDelete={() => deleteDocument.mutate(doc.id)}
                onSend={() => updateStatus.mutate({ id: doc.id, status: 'sent' })}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="declined" className="space-y-4">
          {declined.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No declined or expired documents</p>
              </CardContent>
            </Card>
          ) : (
            declined.map(doc => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onSelect={() => setSelectedDocument(doc)}
                onDelete={() => deleteDocument.mutate(doc.id)}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Generate Document Modal */}
      <GenerateDocumentModal
        open={showGenerateModal}
        onOpenChange={setShowGenerateModal}
        templates={templates}
        leads={leads}
      />

      {/* Upload Document Modal */}
      <UploadDocumentModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        leads={leads}
      />

      {/* Document Detail Modal */}
      <DocumentDetailModal
        document={selectedDocument}
        onClose={() => setSelectedDocument(null)}
      />
    </div>
  );
}

function DocumentCard({
  document,
  onSelect,
  onDelete,
  onResend,
  onSend,
}: {
  document: Document;
  onSelect: () => void;
  onDelete: () => void;
  onResend?: () => void;
  onSend?: () => void;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onSelect}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="text-2xl">{getDocumentTypeIcon(document.document_type)}</div>
            <div>
              <h3 className="font-medium">{document.name}</h3>
              {document.related_to_name && (
                <p className="text-sm text-muted-foreground">{document.related_to_name}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={getStatusBadgeVariant(document.status)}>
                  {document.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(document.created_at), 'MMM d, yyyy')}
                </span>
                {document.sent_to_email && (
                  <span className="text-xs text-muted-foreground">
                    → {document.sent_to_email}
                  </span>
                )}
              </div>
              {document.viewed_at && document.status !== 'signed' && (
                <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  Viewed {format(new Date(document.viewed_at), 'MMM d')}
                </p>
              )}
              {document.signed_at && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Signed {format(new Date(document.signed_at), 'MMM d, h:mm a')}
                </p>
              )}
              {document.expires_at && document.status !== 'signed' && (
                <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Expires {format(new Date(document.expires_at), 'MMM d')}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            {onSend && (
              <Button variant="outline" size="sm" onClick={onSend}>
                <Send className="h-4 w-4 mr-1" />
                Send
              </Button>
            )}
            {onResend && (
              <Button variant="outline" size="sm" onClick={onResend}>
                <Send className="h-4 w-4 mr-1" />
                Resend
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => window.open(document.file_url, '_blank')}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  const link = window.document.createElement('a');
                  link.href = document.file_url;
                  link.download = document.name;
                  link.click();
                }}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GenerateDocumentModal({
  open,
  onOpenChange,
  templates,
  leads,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: DocumentTemplate[];
  leads: any[];
}) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedLead, setSelectedLead] = useState<string>('');
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [sendForSignature, setSendForSignature] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');

  const generateDocument = useGenerateDocument();
  const template = templates.find(t => t.id === selectedTemplate);
  const lead = leads.find(l => l.id === selectedLead);

  const handleGenerate = () => {
    if (!selectedTemplate) return;

    generateDocument.mutate({
      templateId: selectedTemplate,
      leadId: selectedLead || undefined,
      customData: customFields,
      sendForSignature,
      recipientEmail: recipientEmail || lead?.email,
      expiresInDays: 30,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setSelectedTemplate('');
        setSelectedLead('');
        setCustomFields({});
        setSendForSignature(false);
        setRecipientEmail('');
      },
    });
  };

  // Auto-fill fields when lead is selected
  const handleLeadChange = (leadId: string) => {
    setSelectedLead(leadId);
    const selectedLeadData = leads.find(l => l.id === leadId);
    if (selectedLeadData) {
      setCustomFields(prev => ({
        ...prev,
        company: selectedLeadData.company || '',
        first_name: selectedLeadData.firstName || '',
        last_name: selectedLeadData.lastName || '',
      }));
      setRecipientEmail(selectedLeadData.email || '');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate Document</DialogTitle>
          <DialogDescription>
            Create a new document from a template with auto-filled data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    {getDocumentTypeIcon(template.template_type)} {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Related Lead (optional)</Label>
            <Select value={selectedLead} onValueChange={handleLeadChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a lead to auto-fill" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {leads.map(lead => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.firstName} {lead.lastName} - {lead.company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {template && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label>Merge Fields</Label>
                {Object.keys(template.merge_fields).map(field => (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs text-muted-foreground capitalize">
                      {field.replace(/_/g, ' ')}
                    </Label>
                    <Input
                      value={customFields[field] || ''}
                      onChange={e => setCustomFields(prev => ({ ...prev, [field]: e.target.value }))}
                      placeholder={`Enter ${field.replace(/_/g, ' ')}`}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {template?.requires_signature && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sendForSignature"
                    checked={sendForSignature}
                    onChange={e => setSendForSignature(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="sendForSignature">Send for e-signature immediately</Label>
                </div>
                {sendForSignature && (
                  <div className="space-y-1">
                    <Label className="text-xs">Recipient Email</Label>
                    <Input
                      type="email"
                      value={recipientEmail}
                      onChange={e => setRecipientEmail(e.target.value)}
                      placeholder="email@example.com"
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={!selectedTemplate || generateDocument.isPending}>
            {generateDocument.isPending ? 'Generating...' : 'Generate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UploadDocumentModal({
  open,
  onOpenChange,
  leads,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: any[];
}) {
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('custom');
  const [selectedLead, setSelectedLead] = useState('');

  const uploadDocument = useUploadDocument();
  const lead = leads.find(l => l.id === selectedLead);

  const handleUpload = () => {
    if (!file) return;

    uploadDocument.mutate({
      file,
      documentType,
      relatedToId: selectedLead || undefined,
      relatedToType: selectedLead ? 'lead' : undefined,
      relatedToName: lead ? `${lead.firstName} ${lead.lastName} - ${lead.company}` : undefined,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setFile(null);
        setDocumentType('custom');
        setSelectedLead('');
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a PDF, Word document, or other file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              {file ? (
                <div>
                  <FileText className="h-12 w-12 mx-auto mb-2 text-primary" />
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
              ) : (
                <div>
                  <Upload className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">Click to upload or drag and drop</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT up to 10MB</p>
                </div>
              )}
            </label>
          </div>

          <div className="space-y-2">
            <Label>Document Type</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="proposal">Proposal</SelectItem>
                <SelectItem value="nda">NDA</SelectItem>
                <SelectItem value="quote">Quote</SelectItem>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Related Lead (optional)</Label>
            <Select value={selectedLead} onValueChange={setSelectedLead}>
              <SelectTrigger>
                <SelectValue placeholder="Select a lead" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {leads.map(lead => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.firstName} {lead.lastName} - {lead.company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file || uploadDocument.isPending}>
            {uploadDocument.isPending ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DocumentDetailModal({
  document,
  onClose,
}: {
  document: Document | null;
  onClose: () => void;
}) {
  if (!document) return null;

  return (
    <Dialog open={!!document} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getDocumentTypeIcon(document.document_type)}
            {document.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status & Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <div className="mt-1">
                <Badge variant={getStatusBadgeVariant(document.status)} className="text-sm">
                  {document.status}
                </Badge>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Type</Label>
              <div className="mt-1 capitalize">{document.document_type}</div>
            </div>
            {document.sent_to_email && (
              <div>
                <Label className="text-muted-foreground">Sent To</Label>
                <div className="mt-1">{document.sent_to_email}</div>
              </div>
            )}
            {document.related_to_name && (
              <div>
                <Label className="text-muted-foreground">Related To</Label>
                <div className="mt-1">{document.related_to_name}</div>
              </div>
            )}
          </div>

          <Separator />

          {/* Timeline */}
          <div>
            <Label className="text-muted-foreground">Activity Timeline</Label>
            <div className="mt-2 space-y-2">
              {document.signed_at && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Signed {format(new Date(document.signed_at), 'MMM d, yyyy h:mm a')}</span>
                </div>
              )}
              {document.viewed_at && (
                <div className="flex items-center gap-2 text-sm">
                  <Eye className="h-4 w-4 text-yellow-600" />
                  <span>Viewed {format(new Date(document.viewed_at), 'MMM d, yyyy h:mm a')}</span>
                </div>
              )}
              {document.sent_at && (
                <div className="flex items-center gap-2 text-sm">
                  <Send className="h-4 w-4 text-blue-600" />
                  <span>Sent {format(new Date(document.sent_at), 'MMM d, yyyy h:mm a')}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>Created {format(new Date(document.created_at), 'MMM d, yyyy h:mm a')}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Preview */}
          <div>
            <Label className="text-muted-foreground">Document Preview</Label>
            <div className="mt-2 border rounded-lg p-4 bg-muted/30 min-h-[200px]">
              {document.file_type === 'pdf' ? (
                <iframe
                  src={document.file_url}
                  className="w-full h-[400px] rounded"
                  title="Document preview"
                />
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <Button variant="outline" onClick={() => window.open(document.file_url, '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Document
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => {
            const link = window.document.createElement('a');
            link.href = document.file_url;
            link.download = document.name;
            link.click();
          }}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button onClick={() => window.open(document.file_url, '_blank')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
