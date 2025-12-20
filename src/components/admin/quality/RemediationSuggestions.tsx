import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Lightbulb, Check, X, Clock, ChevronDown, ChevronUp, 
  Wand2, Copy, CheckCircle2, FileCode, Loader2 
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";

interface RemediationSuggestion {
  id: string;
  created_at: string;
  updated_at: string;
  vertical_id: string;
  channel: string | null;
  issue_tags: string[];
  occurrence_count: number;
  suggested_changes: {
    action?: string;
    layer?: string;
    target?: string;
    description?: string;
  };
  status: 'draft' | 'approved' | 'rejected' | 'applied';
  reviewed_at: string | null;
  applied_at: string | null;
  applied_by: string | null;
  notes: string | null;
  patch_payload: Record<string, unknown> | null;
  patch_text: string | null;
  patch_target: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
  approved: 'bg-green-500/20 text-green-500 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-500 border-red-500/30',
  applied: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
};

const LAYER_LABELS: Record<string, string> = {
  brain_rules: 'Brain Rules',
  workflow: 'Workflow',
  config_toggle: 'Config Toggle',
  business_facts: 'Business Facts',
};

const PATCH_TARGET_LABELS: Record<string, string> = {
  base_prompt: 'Base Prompt',
  vertical_mapping: 'Vertical Mapping',
  workflow_policy: 'Workflow Policy',
  default_config: 'Default Config',
  business_facts: 'Business Facts',
};

export function RemediationSuggestions() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [patchExpandedId, setPatchExpandedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['remediation-suggestions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('remediation_suggestions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as RemediationSuggestion[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: string; note?: string }) => {
      const updateData: Record<string, unknown> = {
        status,
        reviewed_at: new Date().toISOString(),
      };
      
      if (note) {
        updateData.notes = note;
      }
      
      if (status === 'applied') {
        updateData.applied_at = new Date().toISOString();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          updateData.applied_by = user.id;
        }
      }
      
      const { error } = await supabase
        .from('remediation_suggestions')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['remediation-suggestions'] });
      toast.success(`Suggestion ${status}`);
    },
    onError: (error) => {
      toast.error('Failed to update suggestion');
      console.error(error);
    },
  });

  const generatePatchMutation = useMutation({
    mutationFn: async (suggestionId: string) => {
      const { data, error } = await supabase.functions.invoke('generate-remediation-patch', {
        body: { suggestion_id: suggestionId },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['remediation-suggestions'] });
      toast.success('Patch generated successfully');
      console.log('[RemediationSuggestions] Patch generated:', data);
    },
    onError: (error) => {
      toast.error('Failed to generate patch');
      console.error(error);
    },
  });

  const handleAction = (id: string, status: 'approved' | 'rejected' | 'applied') => {
    updateStatusMutation.mutate({ 
      id, 
      status, 
      note: notes[id] 
    });
    setNotes(prev => ({ ...prev, [id]: '' }));
    setExpandedId(null);
  };

  const handleGeneratePatch = (id: string) => {
    generatePatchMutation.mutate(id);
  };

  const handleCopyPatch = async (patchText: string) => {
    try {
      await navigator.clipboard.writeText(patchText);
      toast.success('Patch copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy patch');
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5" />
            Remediation Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const draftCount = suggestions?.filter(s => s.status === 'draft').length || 0;
  const approvedCount = suggestions?.filter(s => s.status === 'approved' && !s.applied_at).length || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5" />
            Remediation Suggestions
            {draftCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {draftCount} pending review
              </Badge>
            )}
            {approvedCount > 0 && (
              <Badge className="ml-2 bg-green-500/20 text-green-500">
                {approvedCount} approved
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!suggestions?.length ? (
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No suggestions yet</p>
              <p className="text-sm text-muted-foreground">
                Suggestions will appear when patterns are detected across multiple calls.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {suggestions.map((suggestion) => (
              <div 
                key={suggestion.id}
                className={`p-4 rounded-lg border ${STATUS_COLORS[suggestion.status]}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <Badge className={STATUS_COLORS[suggestion.status]}>
                        {suggestion.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">
                        {suggestion.vertical_id?.replace(/_/g, ' ')}
                      </Badge>
                      {suggestion.channel && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {suggestion.channel}
                        </Badge>
                      )}
                      {suggestion.patch_target && (
                        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/30">
                          <FileCode className="h-3 w-3 mr-1" />
                          {PATCH_TARGET_LABELS[suggestion.patch_target] || suggestion.patch_target}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {suggestion.occurrence_count}x occurrences
                      </span>
                    </div>
                    
                    {/* Issue tags */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {suggestion.issue_tags?.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                    
                    {/* Suggested changes */}
                    <div className="bg-background/50 p-3 rounded-lg mb-2">
                      <p className="text-sm font-medium mb-1">
                        {suggestion.suggested_changes?.action}: {suggestion.suggested_changes?.target}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {suggestion.suggested_changes?.description}
                      </p>
                      {suggestion.suggested_changes?.layer && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          Layer: {LAYER_LABELS[suggestion.suggested_changes.layer] || suggestion.suggested_changes.layer}
                        </Badge>
                      )}
                    </div>
                    
                    {suggestion.notes && (
                      <p className="text-sm text-muted-foreground italic">
                        Note: {suggestion.notes}
                      </p>
                    )}
                    
                    <p className="text-xs text-muted-foreground mt-2">
                      Created {format(new Date(suggestion.created_at), 'MMM d, h:mm a')}
                      {suggestion.reviewed_at && (
                        <span> • Reviewed {format(new Date(suggestion.reviewed_at), 'MMM d')}</span>
                      )}
                      {suggestion.applied_at && (
                        <span> • Applied {format(new Date(suggestion.applied_at), 'MMM d')}</span>
                      )}
                    </p>
                  </div>
                  
                  {suggestion.status === 'draft' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedId(expandedId === suggestion.id ? null : suggestion.id)}
                    >
                      {expandedId === suggestion.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
                
                {/* Expanded actions for draft suggestions */}
                {expandedId === suggestion.id && suggestion.status === 'draft' && (
                  <div className="mt-4 pt-4 border-t border-current/10 space-y-3">
                    <Textarea
                      placeholder="Add notes (optional)..."
                      value={notes[suggestion.id] || ''}
                      onChange={(e) => setNotes(prev => ({ ...prev, [suggestion.id]: e.target.value }))}
                      className="text-sm"
                      rows={2}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAction(suggestion.id, 'approved')}
                        disabled={updateStatusMutation.isPending}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAction(suggestion.id, 'rejected')}
                        disabled={updateStatusMutation.isPending}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <p className="text-xs text-muted-foreground ml-2">
                        ⚠️ This does NOT auto-apply changes
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Patch generation and display for approved suggestions */}
                {suggestion.status === 'approved' && (
                  <div className="mt-3 pt-3 border-t border-current/10 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {!suggestion.patch_text ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGeneratePatch(suggestion.id)}
                          disabled={generatePatchMutation.isPending}
                          className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border-amber-500/30"
                        >
                          {generatePatchMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Wand2 className="h-4 w-4 mr-1" />
                          )}
                          Generate Patch
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyPatch(suggestion.patch_text!)}
                            className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border-blue-500/30"
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Copy Patch
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGeneratePatch(suggestion.id)}
                            disabled={generatePatchMutation.isPending}
                          >
                            {generatePatchMutation.isPending ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Wand2 className="h-4 w-4 mr-1" />
                            )}
                            Regenerate
                          </Button>
                        </>
                      )}
                      
                      {!suggestion.applied_at && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(suggestion.id, 'applied')}
                          disabled={updateStatusMutation.isPending}
                          className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 border-purple-500/30"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Mark as Applied
                        </Button>
                      )}
                    </div>
                    
                    {/* Collapsible patch text display */}
                    {suggestion.patch_text && (
                      <Collapsible
                        open={patchExpandedId === suggestion.id}
                        onOpenChange={(open) => setPatchExpandedId(open ? suggestion.id : null)}
                      >
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-full justify-between">
                            <span className="flex items-center gap-2">
                              <FileCode className="h-4 w-4" />
                              View Patch Code
                            </span>
                            {patchExpandedId === suggestion.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="mt-2 relative">
                            <pre className="bg-background text-foreground p-4 rounded-lg text-xs overflow-x-auto max-h-80 overflow-y-auto border">
                              {suggestion.patch_text}
                            </pre>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="absolute top-2 right-2"
                              onClick={() => handleCopyPatch(suggestion.patch_text!)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
