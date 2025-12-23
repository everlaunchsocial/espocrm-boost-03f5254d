import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Mic, 
  Copy, 
  Check, 
  RefreshCw, 
  Star, 
  ChevronDown,
  MessageSquare,
  Target,
  HelpCircle,
  Lightbulb,
  Shield,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useCallScripts,
  useGenerateCallScript,
  useMarkScriptUsed,
  useRateScript,
  SCRIPT_TYPE_CONFIG,
  ScriptType,
  CallScript,
  CallOutcome,
} from '@/hooks/useCallScripts';
import { formatDistanceToNow } from 'date-fns';

interface CallScriptPanelProps {
  leadId: string;
  leadName: string;
  className?: string;
}

const OUTCOME_OPTIONS: { value: CallOutcome; label: string; icon: string }[] = [
  { value: 'booked', label: 'Booked Demo/Meeting', icon: '📅' },
  { value: 'callback', label: 'Callback Requested', icon: '📞' },
  { value: 'not_interested', label: 'Not Interested', icon: '👎' },
  { value: 'no_answer', label: 'No Answer', icon: '📵' },
];

export function CallScriptPanel({ leadId, leadName, className }: CallScriptPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scriptType, setScriptType] = useState<ScriptType>('follow_up');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [outcome, setOutcome] = useState<CallOutcome | null>(null);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [activeScript, setActiveScript] = useState<CallScript | null>(null);

  const { data: scripts = [], isLoading: scriptsLoading } = useCallScripts(leadId);
  const generateScript = useGenerateCallScript();
  const markUsed = useMarkScriptUsed();
  const rateScript = useRateScript();

  const latestScript = scripts[0] || null;

  const handleGenerate = () => {
    generateScript.mutate(
      { leadId, scriptType },
      {
        onSuccess: (script) => {
          setActiveScript(script);
          toast.success('Script generated successfully');
        },
        onError: (error) => {
          toast.error('Failed to generate script: ' + error.message);
        },
      }
    );
  };

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleCopyFull = () => {
    if (!displayScript) return;
    const content = displayScript.script_content;
    const fullText = `
OPENING:
${content.opening}

CONTEXT:
${content.contextReference}

VALUE PROPOSITION:
${content.valueProposition}

DISCOVERY QUESTIONS:
${content.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

CLOSING:
${content.closing}

ALTERNATIVE CLOSES:
${content.alternativeCloses.map((c, i) => `${i + 1}. ${c}`).join('\n')}
    `.trim();
    
    navigator.clipboard.writeText(fullText);
    toast.success('Full script copied to clipboard');
  };

  const handleMarkUsed = () => {
    if (!displayScript) return;
    markUsed.mutate(displayScript.id, {
      onSuccess: () => {
        toast.success('Script marked as used');
        setFeedbackOpen(true);
      },
    });
  };

  const handleSubmitFeedback = () => {
    if (!displayScript || !outcome) return;
    rateScript.mutate(
      { scriptId: displayScript.id, rating, outcome },
      {
        onSuccess: () => {
          toast.success('Feedback recorded');
          setFeedbackOpen(false);
          setRating(0);
          setOutcome(null);
          setFeedbackNotes('');
        },
      }
    );
  };

  const displayScript = activeScript || latestScript;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <Card className="border-primary/20">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Call Script</CardTitle>
                {displayScript && (
                  <Badge variant="outline" className="text-xs">
                    {SCRIPT_TYPE_CONFIG[displayScript.script_type as ScriptType]?.label}
                  </Badge>
                )}
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform",
                isOpen && "rotate-180"
              )} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Generate Controls */}
            <div className="flex items-center gap-2">
              <Select value={scriptType} onValueChange={(v) => setScriptType(v as ScriptType)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Script type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SCRIPT_TYPE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <span>{config.icon}</span>
                        <span>{config.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleGenerate} 
                disabled={generateScript.isPending}
                size="sm"
              >
                {generateScript.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Mic className="h-4 w-4 mr-2" />
                )}
                Generate Script
              </Button>
            </div>

            {/* Script Display */}
            {displayScript ? (
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Generated {formatDistanceToNow(new Date(displayScript.generated_at), { addSuffix: true })}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={handleCopyFull}>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy All
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleMarkUsed}>
                      <Check className="h-3 w-3 mr-1" />
                      Mark Used
                    </Button>
                  </div>
                </div>

                {/* Key Points */}
                {displayScript.script_content.keyPoints?.length > 0 && (
                  <div className="bg-primary/5 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Target className="h-4 w-4 text-primary" />
                      Key Points
                    </div>
                    <ul className="text-sm space-y-1">
                      {displayScript.script_content.keyPoints.map((point, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Opening */}
                <ScriptSection
                  icon={<MessageSquare className="h-4 w-4" />}
                  title="Opening"
                  content={displayScript.script_content.opening}
                  onCopy={() => handleCopy(displayScript.script_content.opening, 'opening')}
                  copied={copiedSection === 'opening'}
                />

                {/* Context Reference */}
                <ScriptSection
                  icon={<Lightbulb className="h-4 w-4" />}
                  title="Context Reference"
                  content={displayScript.script_content.contextReference}
                  onCopy={() => handleCopy(displayScript.script_content.contextReference, 'context')}
                  copied={copiedSection === 'context'}
                />

                {/* Discovery Questions */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <HelpCircle className="h-4 w-4 text-amber-500" />
                    Discovery Questions
                  </div>
                  <ol className="list-decimal list-inside text-sm space-y-2 bg-muted/50 rounded-lg p-3">
                    {displayScript.script_content.questions.map((q, i) => (
                      <li key={i} className="text-muted-foreground">
                        <span className="text-foreground">{q}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Value Proposition */}
                <ScriptSection
                  icon={<Lightbulb className="h-4 w-4" />}
                  title="Value Proposition"
                  content={displayScript.script_content.valueProposition}
                  onCopy={() => handleCopy(displayScript.script_content.valueProposition, 'value')}
                  copied={copiedSection === 'value'}
                />

                {/* Objection Responses */}
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="objections" className="border rounded-lg">
                    <AccordionTrigger className="px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-blue-500" />
                        Objection Responses
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 pb-3 space-y-3">
                      {Object.entries(displayScript.script_content.objectionResponses).map(([key, response]) => (
                        <div key={key} className="space-y-1">
                          <div className="text-xs font-medium text-muted-foreground uppercase">
                            {key.replace(/_/g, ' ')}
                          </div>
                          <p className="text-sm bg-muted/50 p-2 rounded">{response}</p>
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {/* Closing */}
                <ScriptSection
                  icon={<Target className="h-4 w-4" />}
                  title="Closing"
                  content={displayScript.script_content.closing}
                  onCopy={() => handleCopy(displayScript.script_content.closing, 'closing')}
                  copied={copiedSection === 'closing'}
                  highlight
                />

                {/* Alternative Closes */}
                {displayScript.script_content.alternativeCloses?.length > 0 && (
                  <div className="text-sm space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Alternative Closes:</div>
                    {displayScript.script_content.alternativeCloses.map((close, i) => (
                      <p key={i} className="text-muted-foreground italic">"{close}"</p>
                    ))}
                  </div>
                )}

                {/* Effectiveness Rating */}
                {displayScript.effectiveness_rating && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Effectiveness:</span>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            "h-4 w-4",
                            star <= displayScript.effectiveness_rating!
                              ? "text-amber-400 fill-amber-400"
                              : "text-muted-foreground"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Mic className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No script generated yet</p>
                <p className="text-xs">Select a script type and click Generate</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>

      {/* Feedback Dialog */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>How did the call go?</DialogTitle>
            <DialogDescription>
              Your feedback helps improve future script generation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Outcome */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Call Outcome</label>
              <div className="grid grid-cols-2 gap-2">
                {OUTCOME_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={outcome === opt.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOutcome(opt.value)}
                    className="justify-start"
                  >
                    <span className="mr-2">{opt.icon}</span>
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Script Effectiveness</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={cn(
                        "h-6 w-6",
                        star <= rating
                          ? "text-amber-400 fill-amber-400"
                          : "text-muted-foreground"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                placeholder="What worked? What didn't?"
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackOpen(false)}>
              Skip
            </Button>
            <Button 
              onClick={handleSubmitFeedback}
              disabled={!outcome || rateScript.isPending}
            >
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Collapsible>
  );
}

function ScriptSection({
  icon,
  title,
  content,
  onCopy,
  copied,
  highlight = false,
}: {
  icon: React.ReactNode;
  title: string;
  content: string;
  onCopy: () => void;
  copied: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      "space-y-2 rounded-lg p-3",
      highlight ? "bg-primary/10 border border-primary/20" : "bg-muted/50"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className={highlight ? "text-primary" : "text-muted-foreground"}>{icon}</span>
          {title}
        </div>
        <Button variant="ghost" size="sm" onClick={onCopy} className="h-6 px-2">
          {copied ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
      <p className="text-sm italic">"{content}"</p>
    </div>
  );
}
