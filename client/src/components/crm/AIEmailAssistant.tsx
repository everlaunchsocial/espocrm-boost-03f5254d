import { useState } from 'react';
import { EmailRecipient } from '@/types/crm';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Wand2, X } from 'lucide-react';
import { toast } from 'sonner';

interface AIEmailAssistantProps {
  recipient: EmailRecipient;
  senderName: string;
  onGenerated: (body: string) => void;
  onCancel: () => void;
}

const PROMPT_OPTIONS = [
  { id: 'introduction', label: 'Introduction', description: 'Introduce yourself and your services' },
  { id: 'follow-up', label: 'Follow Up', description: 'Check in after a previous conversation' },
  { id: 'appointment', label: 'Schedule Meeting', description: 'Request to schedule a call or meeting' },
  { id: 'thank-you', label: 'Thank You', description: 'Thank them for their time' },
  { id: 'custom', label: 'Custom', description: 'Write your own prompt' },
] as const;

export function AIEmailAssistant({ recipient, senderName, onGenerated, onCancel }: AIEmailAssistantProps) {
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!selectedPrompt) {
      toast.error('Please select a prompt type');
      return;
    }

    if (selectedPrompt === 'custom' && !customPrompt.trim()) {
      toast.error('Please enter a custom prompt');
      return;
    }

    setGenerating(true);

    try {
      // Get company name from either accountName (contact) or company (lead)
      const companyName = recipient.accountName || recipient.company;

      const { data, error } = await supabase.functions.invoke('ai-email-writer', {
        body: {
          promptType: selectedPrompt,
          customPrompt: selectedPrompt === 'custom' ? customPrompt : undefined,
          contactName: `${recipient.firstName} ${recipient.lastName}`,
          contactCompany: companyName,
          contactTitle: recipient.title,
          senderName,
          additionalContext: additionalContext.trim() || undefined,
        },
      });

      if (error) throw error;

      if (data?.email) {
        onGenerated(data.email);
        toast.success('Email generated!');
      } else {
        throw new Error('No email content generated');
      }
    } catch (error: any) {
      console.error('Error generating email:', error);
      toast.error(error.message || 'Failed to generate email');
    } finally {
      setGenerating(false);
    }
  };

  const companyName = recipient.accountName || recipient.company;

  return (
    <div className="space-y-4 p-4 bg-muted/50 rounded-lg border border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          <span className="font-medium">AI Email Assistant</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Prompt type selection */}
      <div className="space-y-2">
        <Label>What kind of email do you want to write?</Label>
        <div className="grid grid-cols-2 gap-2">
          {PROMPT_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => setSelectedPrompt(option.id)}
              className={`p-3 rounded-lg border text-left transition-colors ${
                selectedPrompt === option.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <p className="font-medium text-sm">{option.label}</p>
              <p className="text-xs text-muted-foreground">{option.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Custom prompt input */}
      {selectedPrompt === 'custom' && (
        <div className="space-y-2">
          <Label>Your prompt</Label>
          <Textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Describe what you want the email to say..."
            rows={3}
          />
        </div>
      )}

      {/* Additional context */}
      <div className="space-y-2">
        <Label>Additional context (optional)</Label>
        <Textarea
          value={additionalContext}
          onChange={(e) => setAdditionalContext(e.target.value)}
          placeholder="Add any specific details, previous conversation notes, or points you want to mention..."
          rows={2}
        />
      </div>

      {/* Recipient info preview */}
      <div className="text-xs text-muted-foreground p-2 bg-background rounded border border-border">
        <p>Writing to: <strong>{recipient.firstName} {recipient.lastName}</strong></p>
        {recipient.title && <p>Title: {recipient.title}</p>}
        {companyName && <p>Company: {companyName}</p>}
      </div>

      {/* Generate button */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleGenerate} disabled={generating || !selectedPrompt}>
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4 mr-2" />
              Generate Email
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
