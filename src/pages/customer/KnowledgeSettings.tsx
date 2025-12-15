import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerOnboarding } from '@/hooks/useCustomerOnboarding';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, BookOpen, Globe, FileText, Upload, Trash2, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function KnowledgeSettings() {
  const navigate = useNavigate();
  const { 
    customerProfile,
    chatSettings,
    knowledgeSources,
    updateProfile,
    updateChatSettings,
    addKnowledgeSource,
    removeKnowledgeSource,
    isLoading 
  } = useCustomerOnboarding();
  
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [useWebsiteKnowledge, setUseWebsiteKnowledge] = useState(true);
  const [useUploadedDocs, setUseUploadedDocs] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (customerProfile?.website_url) {
      setWebsiteUrl(customerProfile.website_url);
    }
    if (chatSettings) {
      setUseWebsiteKnowledge(chatSettings.use_website_knowledge ?? true);
      setUseUploadedDocs(chatSettings.use_uploaded_docs ?? false);
    }
  }, [customerProfile, chatSettings]);

  const normalizeUrl = (url: string): string => {
    if (!url) return '';
    let normalized = url.trim();
    if (normalized && !normalized.match(/^https?:\/\//i)) {
      normalized = 'https://' + normalized;
    }
    return normalized;
  };

  const handleWebsiteUrlBlur = async () => {
    const normalizedUrl = normalizeUrl(websiteUrl);
    if (normalizedUrl !== websiteUrl) {
      setWebsiteUrl(normalizedUrl);
    }
    
    if (normalizedUrl !== customerProfile?.website_url) {
      setIsSaving(true);
      const success = await updateProfile({ website_url: normalizedUrl || null });
      setIsSaving(false);
      if (success) {
        toast.success('Website URL saved');
      }
    }
  };

  const handleToggleWebsite = async (checked: boolean) => {
    setUseWebsiteKnowledge(checked);
    const success = await updateChatSettings({ use_website_knowledge: checked });
    if (success) {
      toast.success('Settings saved');
    }
  };

  const handleToggleDocs = async (checked: boolean) => {
    setUseUploadedDocs(checked);
    const success = await updateChatSettings({ use_uploaded_docs: checked });
    if (success) {
      toast.success('Settings saved');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !customerProfile) return;

    setIsUploading(true);
    
    for (const file of Array.from(files)) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name} is not a supported file type. Please upload PDF, TXT, or DOCX files.`);
        continue;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Maximum file size is 10MB.`);
        continue;
      }

      const storagePath = `${customerProfile.id}/${Date.now()}-${file.name}`;
      
      try {
        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('customer-documents')
          .upload(storagePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        // Add knowledge source record
        const result = await addKnowledgeSource({
          source_type: 'document',
          file_name: file.name,
          storage_path: storagePath
        });

        if (result) {
          toast.success(`${file.name} uploaded`);
          
          // Trigger document parsing in background
          supabase.functions.invoke('parse-document', {
            body: { knowledge_source_id: result.id }
          }).then(({ error }) => {
            if (error) console.error('Parse document error:', error);
          });
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setIsUploading(false);
    event.target.value = '';
  };

  const handleRemoveSource = async (id: string, storagePath?: string | null, fileName?: string) => {
    // Delete from storage if path exists
    if (storagePath) {
      await supabase.storage.from('customer-documents').remove([storagePath]);
    }
    const success = await removeKnowledgeSource(id);
    if (success) {
      toast.success(`${fileName || 'Document'} removed`);
    }
  };

  const documentSources = knowledgeSources.filter(s => s.source_type === 'document');
  const showUrlWarning = useWebsiteKnowledge && !websiteUrl;

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-2xl mx-auto animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-40 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/customer/settings')}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Button>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Knowledge & Content
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage what your AI assistant knows about your business
          </p>
        </div>

        <div className="space-y-6">
          {/* Website Source Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Globe className="h-5 w-5 text-primary" />
                Website Source
              </CardTitle>
              <CardDescription>
                Your AI will learn from your website content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="website-url">Website URL</Label>
                <Input
                  id="website-url"
                  type="url"
                  placeholder="https://yourbusiness.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  onBlur={handleWebsiteUrlBlur}
                  disabled={isSaving}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div>
                  <Label className="font-medium">Use my website as a knowledge source</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your AI will reference content from your website
                  </p>
                </div>
                <Switch
                  checked={useWebsiteKnowledge}
                  onCheckedChange={handleToggleWebsite}
                />
              </div>

              {showUrlWarning && (
                <Alert variant="default" className="border-warning/50 bg-warning/10">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <AlertDescription className="text-warning-foreground">
                    Please provide a website URL for your AI to use as a knowledge source.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Uploaded Documents Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-primary" />
                Uploaded Documents
              </CardTitle>
              <CardDescription>
                Upload documents with FAQs, services, and other info your AI should reference
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div>
                  <Label className="font-medium">Use uploaded documents</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your AI will reference content from your uploaded files
                  </p>
                </div>
                <Switch
                  checked={useUploadedDocs}
                  onCheckedChange={handleToggleDocs}
                />
              </div>

              {useUploadedDocs && (
                <>
                  {/* Upload Area */}
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <input
                      type="file"
                      id="file-upload"
                      multiple
                      accept=".pdf,.txt,.docx"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {isUploading ? 'Uploading...' : 'Click to upload files'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        PDF, TXT, or DOCX (max 10MB each)
                      </span>
                    </label>
                  </div>

                  {/* Documents List */}
                  {documentSources.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm">Your Documents</Label>
                      <div className="space-y-2">
                        {documentSources.map((source) => (
                          <div
                            key={source.id}
                            className="flex items-center justify-between p-3 bg-muted rounded-lg"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm truncate">{source.file_name}</span>
                              {source.status === 'processed' ? (
                                <span className="flex items-center gap-1 text-xs text-green-600 flex-shrink-0">
                                  <CheckCircle className="h-3 w-3" />
                                  Ready
                                </span>
                              ) : source.status === 'pending' ? (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Processing
                                </span>
                              ) : (
                                <span className="text-xs text-destructive flex-shrink-0">
                                  ({source.status})
                                </span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveSource(source.id, source.storage_path, source.file_name || undefined)}
                              className="flex-shrink-0"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {documentSources.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No documents uploaded yet
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
