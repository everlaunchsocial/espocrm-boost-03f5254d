import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, Building2 } from 'lucide-react';
import { useDemos } from '@/hooks/useDemos';
import { toast } from 'sonner';
import { AvatarSelector, AvatarOption, AVATAR_OPTIONS } from './AvatarSelector';

interface DemoCreationModalProps {
  open: boolean;
  onClose: () => void;
  leadId?: string;
  contactId?: string;
  defaultBusinessName?: string;
  defaultWebsiteUrl?: string;
}

export function DemoCreationModal({
  open,
  onClose,
  leadId,
  contactId,
  defaultBusinessName = '',
  defaultWebsiteUrl = '',
}: DemoCreationModalProps) {
  const navigate = useNavigate();
  const { createDemo, captureScreenshot } = useDemos();

  const [businessName, setBusinessName] = useState(defaultBusinessName);
  const [websiteUrl, setWebsiteUrl] = useState(defaultWebsiteUrl);
  const [aiPersonaName, setAiPersonaName] = useState('');
  const [chatTitle, setChatTitle] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarOption | null>(AVATAR_OPTIONS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens OR when entity changes (leadId/contactId/defaults change)
  useEffect(() => {
    if (open) {
      // Always reset form state when modal opens or entity changes
      setBusinessName(defaultBusinessName);
      setWebsiteUrl(defaultWebsiteUrl);
      setAiPersonaName('');
      setChatTitle('');
      setSelectedAvatar(AVATAR_OPTIONS[0]);
      setError(null);
    }
  }, [open, leadId, contactId, defaultBusinessName, defaultWebsiteUrl]);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!businessName.trim()) {
      setError('Business name is required');
      return;
    }

    if (!websiteUrl.trim()) {
      setError('Website URL is required');
      return;
    }

    if (!leadId && !contactId) {
      setError('Demo must be tied to a Lead or Contact');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createDemo({
        lead_id: leadId || null,
        contact_id: contactId || null,
        business_name: businessName.trim(),
        website_url: websiteUrl.trim(),
        ai_persona_name: aiPersonaName.trim() || selectedAvatar?.name || undefined,
        avatar_url: selectedAvatar?.imageUrl || undefined,
        chat_title: chatTitle.trim() || undefined,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.data) {
        toast.success('Demo created successfully');
        onClose();
        navigate(`/demos/${result.data.id}`);
        
        // Asynchronously capture screenshot after navigation (non-blocking)
        if (websiteUrl.trim()) {
          captureScreenshot(result.data.id, websiteUrl.trim()).then((screenshotResult) => {
            if (screenshotResult.error) {
              console.log('Screenshot capture failed (non-fatal):', screenshotResult.error);
            } else {
              console.log('Screenshot captured successfully for demo:', result.data?.id);
            }
          });
        }
      }
    } catch (err) {
      console.error('Failed to create demo:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const entityType = leadId ? 'Lead' : contactId ? 'Contact' : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create AI Demo</DialogTitle>
          <DialogDescription>
            Create a personalized AI demo for this {entityType?.toLowerCase() || 'record'}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Entity Type Badge */}
          {entityType && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Linked to:</span>
              <Badge variant="secondary" className="flex items-center gap-1">
                {entityType === 'Lead' ? (
                  <User className="h-3 w-3" />
                ) : (
                  <Building2 className="h-3 w-3" />
                )}
                {entityType}
              </Badge>
            </div>
          )}

          {/* Business Name */}
          <div className="space-y-2">
            <Label htmlFor="businessName">
              Business Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Enter business name"
              required
            />
          </div>

          {/* Website URL */}
          <div className="space-y-2">
            <Label htmlFor="websiteUrl">
              Website URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="websiteUrl"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
              required
            />
          </div>

          {/* AI Avatar Selection */}
          <div className="space-y-2">
            <Label>
              AI Avatar <span className="text-muted-foreground text-xs">(select one)</span>
            </Label>
            <AvatarSelector 
              selectedAvatarId={selectedAvatar?.id || null}
              onSelect={(avatar) => {
                setSelectedAvatar(avatar);
                // Auto-fill persona name if empty
                if (!aiPersonaName) {
                  setAiPersonaName(avatar.name);
                }
              }}
            />
          </div>

          {/* AI Persona Name (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="aiPersonaName">
              AI Persona Name <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="aiPersonaName"
              value={aiPersonaName}
              onChange={(e) => setAiPersonaName(e.target.value)}
              placeholder={selectedAvatar ? selectedAvatar.name : "e.g., Jenna, Emma"}
            />
          </div>

          {/* Chat Title (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="chatTitle">
              Chat Title <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="chatTitle"
              value={chatTitle}
              onChange={(e) => setChatTitle(e.target.value)}
              placeholder="e.g., Chat with us (default)"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Demo'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
