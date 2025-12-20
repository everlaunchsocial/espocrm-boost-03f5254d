import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Tag } from "lucide-react";

interface IssueTag {
  issue_tag: string;
  occurrence_count: number;
  affected_verticals: string[] | null;
  avg_score_impact: number;
}

interface TopIssueTagsProps {
  days?: number;
  verticalId?: string;
  channel?: string;
}

const ISSUE_LABELS: Record<string, { label: string; severity: 'low' | 'medium' | 'high' | 'critical' }> = {
  // Critical - Compliance
  restricted_advice_risk_legal: { label: 'Legal Advice Risk', severity: 'critical' },
  restricted_advice_risk_medical: { label: 'Medical Advice Risk', severity: 'critical' },
  restricted_advice_risk_financial: { label: 'Financial Advice Risk', severity: 'critical' },
  guarantee_language_used: { label: 'Guarantee Language', severity: 'critical' },
  
  // High - Flow Issues
  missed_escalation: { label: 'Missed Escalation', severity: 'high' },
  after_hours_flow_missed: { label: 'After Hours Issue', severity: 'high' },
  booking_when_disabled: { label: 'Booking When Disabled', severity: 'high' },
  
  // Medium - Lead Capture
  failed_to_capture_phone: { label: 'Phone Not Captured', severity: 'medium' },
  failed_to_capture_email: { label: 'Email Not Captured', severity: 'medium' },
  incomplete_lead_info: { label: 'Incomplete Lead Info', severity: 'medium' },
  pricing_handling_weak: { label: 'Weak Pricing Handling', severity: 'medium' },
  
  // Low - Quality
  too_many_questions: { label: 'Too Many Questions', severity: 'low' },
  too_few_questions: { label: 'Too Few Questions', severity: 'low' },
  unclear_communication: { label: 'Unclear Communication', severity: 'low' },
  caller_frustration: { label: 'Caller Frustrated', severity: 'medium' },
  unresolved_inquiry: { label: 'Unresolved Inquiry', severity: 'medium' },
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-black',
  low: 'bg-blue-500 text-white',
};

export function TopIssueTags({ days = 7, verticalId, channel }: TopIssueTagsProps) {
  const { data: issues, isLoading } = useQuery({
    queryKey: ['top-issue-tags', days, verticalId, channel],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_top_issue_tags', {
          p_vertical_id: verticalId || null,
          p_channel: channel || null,
          p_days: days,
          p_limit: 10
        });
      
      if (error) throw error;
      return data as IssueTag[];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Tag className="h-5 w-5" />
            Top Recurring Issues
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!issues?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Tag className="h-5 w-5" />
            Top Recurring Issues
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg">
            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
              ✓
            </div>
            <div>
              <p className="font-medium text-green-500">No recurring issues detected!</p>
              <p className="text-sm text-muted-foreground">Great performance in the last {days} days.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...issues.map(i => i.occurrence_count));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Tag className="h-5 w-5" />
          Top Recurring Issues (Last {days} Days)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {issues.map((issue, idx) => {
          const info = ISSUE_LABELS[issue.issue_tag] || { 
            label: issue.issue_tag.replace(/_/g, ' '), 
            severity: 'low' as const 
          };
          const percentage = (issue.occurrence_count / maxCount) * 100;
          
          return (
            <div key={issue.issue_tag} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground w-5">
                    {idx + 1}.
                  </span>
                  <span className="font-medium capitalize">{info.label}</span>
                  <Badge className={`text-xs ${SEVERITY_COLORS[info.severity]}`}>
                    {info.severity}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{issue.occurrence_count}x</span>
                  <span className="text-xs text-muted-foreground">
                    avg score: {issue.avg_score_impact?.toFixed(1)}
                  </span>
                </div>
              </div>
              <Progress value={percentage} className="h-2" />
              {issue.affected_verticals && issue.affected_verticals.length > 0 && (
                <div className="flex flex-wrap gap-1 ml-7">
                  {issue.affected_verticals.slice(0, 3).map(v => (
                    <Badge key={v} variant="outline" className="text-xs capitalize">
                      {v?.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                  {issue.affected_verticals.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{issue.affected_verticals.length - 3} more
                    </Badge>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}