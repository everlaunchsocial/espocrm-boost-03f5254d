import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerOnboarding } from '@/hooks/useCustomerOnboarding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, ArrowRight, BookOpen, Globe, FileText, Upload, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function OnboardingStep3() {
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
  
  const [useWebsiteKnowledge, setUseWebsiteKnowledge] = useState(true);
  const [useUploadedDocs, setUseUploadedDocs] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (chatSettings) {
      setUseWebsiteKnowledge(chatSettings.use_website_knowledge ?? true);
      setUseUploadedDocs(chatSettings.use_uploaded_docs ?? false);
    }
  }, [chatSettings]);

  const handleSave = async (showToast = false) => {
    const success = await updateChatSettings({
      use_website_knowledge: useWebsiteKnowledge,
      use_uploaded_docs: useUploadedDocs
    });

    if (success && showToast) {
      toast.success('Progress saved');
    }
    
    return success;
  };

  const handleToggleWebsite = async (checked: boolean) => {
    setUseWebsiteKnowledge(checked);
    await updateChatSettings({ use_website_knowledge: checked });
  };

  const handleToggleDocs = async (checked: boolean) => {
    setUseUploadedDocs(checked);
    await updateChatSettings({ use_uploaded_docs: checked });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    
    for (const file of Array.from(files)) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name} is not a supported file type. Please upload PDF, TXT, or DOCX files.`);
        continue;
      }

      // For now, we'll just track the file metadata
      // In production, you'd upload to Supabase Storage
      await addKnowledgeSource({
        source_type: 'document',
        file_name: file.name,
        storage_path: `uploads/${customerProfile?.id}/${file.name}`
      });

      toast.success(`${file.name} added`);
    }

    setIsUploading(false);
    event.target.value = '';
  };

  const handleRemoveSource = async (id: string) => {
    await removeKnowledgeSource(id);
    toast.success('Document removed');
  };

  const handleNext = async () => {
    setIsSaving(true);
    const success = await handleSave(false);
    setIsSaving(false);

    if (success) {
      await updateProfile({
        onboarding_stage: 'wizard_step_4',
        onboarding_current_step: 4
      });
      navigate('/customer/onboarding/wizard/4');
    }
  };

  const handleBack = () => {
    navigate('/customer/onboarding/wizard/2');
  };

  const hasNoKnowledgeSources = !useWebsiteKnowledge && knowledgeSources.length === 0;

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/2" />
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-40 bg-muted rounded" />
      </div>
    );
  }

  return (
    <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Knowledge & Content
          </CardTitle>
          <CardDescription>
            Help your AI assistant learn about your business to provide accurate answers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Website Knowledge */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div className="flex items-start gap-3">
              <Globe className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <Label className="font-medium">Use Website Content</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Your AI will learn from your website at{' '}
                  <span className="font-medium">{customerProfile?.website_url || 'your website'}</span>
                </p>
              </div>
            </div>
            <Switch
              checked={useWebsiteKnowledge}
              onCheckedChange={handleToggleWebsite}
            />
          </div>

          {/* Document Upload Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <Label className="font-medium">Use Uploaded Documents</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload PDFs, Word docs, or text files with additional information
                </p>
              </div>
            </div>
            <Switch
              checked={useUploadedDocs}
              onCheckedChange={handleToggleDocs}
            />
          </div>

          {/* File Upload Area */}
          {useUploadedDocs && (
            <div className="space-y-4">
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

              {/* Uploaded Files List */}
              {knowledgeSources.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">Uploaded Documents</Label>
                  <div className="space-y-2">
                    {knowledgeSources.map((source) => (
                      <div
                        key={source.id}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{source.file_name}</span>
                          <span className="text-xs text-muted-foreground capitalize">
                            ({source.status})
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSource(source.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Warning if no knowledge sources */}
          {hasNoKnowledgeSources && (
            <Alert variant="default" className="border-warning/50 bg-warning/10">
              <AlertCircle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-warning-foreground">
                Your AI assistant works best with knowledge sources. Consider enabling website content or uploading documents.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handleBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleNext} disabled={isSaving} className="gap-2">
              {isSaving ? 'Saving...' : 'Next: Lead Capture'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
  );
}
