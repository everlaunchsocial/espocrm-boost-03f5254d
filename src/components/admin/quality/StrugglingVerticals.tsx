import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, TrendingDown, Phone, MessageSquare } from "lucide-react";

interface StrugglingVertical {
  vertical_id: string;
  channel: string;
  call_count: number;
  avg_score: number;
  low_score_count: number;
  top_issues: string[] | null;
}

interface StrugglingVerticalsProps {
  days?: number;
}

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  phone: <Phone className="h-3 w-3" />,
  web_chat: <MessageSquare className="h-3 w-3" />,
  web_voice: <Phone className="h-3 w-3" />,
  sms: <MessageSquare className="h-3 w-3" />,
};

const ISSUE_LABELS: Record<string, string> = {
  missed_escalation: 'Missed Escalation',
  booking_when_disabled: 'Booking When Off',
  failed_to_capture_phone: 'No Phone Captured',
  failed_to_capture_email: 'No Email Captured',
  too_many_questions: 'Too Many Questions',
  restricted_advice_risk_legal: 'Legal Risk',
  restricted_advice_risk_medical: 'Medical Risk',
  pricing_handling_weak: 'Weak Pricing',
  after_hours_flow_missed: 'After Hours Issue',
  caller_frustration: 'Caller Frustrated',
  unresolved_inquiry: 'Unresolved',
};

export function StrugglingVerticals({ days = 7 }: StrugglingVerticalsProps) {
  const { data: verticals, isLoading } = useQuery({
    queryKey: ['struggling-verticals', days],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_struggling_verticals', {
          p_days: days,
          p_limit: 5,
          p_min_calls: 3
        });
      
      if (error) throw error;
      return data as StrugglingVertical[];
    },
  });

  const getScoreColor = (score: number) => {
    if (score >= 7) return 'text-green-500';
    if (score >= 5) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 7) return 'bg-green-500/10';
    if (score >= 5) return 'bg-yellow-500/10';
    return 'bg-red-500/10';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingDown className="h-5 w-5 text-red-500" />
            Struggling Verticals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!verticals?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingDown className="h-5 w-5 text-red-500" />
            Struggling Verticals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg">
            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
              ✓
            </div>
            <div>
              <p className="font-medium text-green-500">All verticals performing well!</p>
              <p className="text-sm text-muted-foreground">No struggling verticals in the last {days} days.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingDown className="h-5 w-5 text-red-500" />
          Struggling Verticals (Last {days} Days)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {verticals.map((v, idx) => (
          <div 
            key={`${v.vertical_id}-${v.channel}`}
            className={`p-4 rounded-lg border ${getScoreBg(v.avg_score)}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-muted-foreground">#{idx + 1}</span>
                <div>
                  <p className="font-medium capitalize">{v.vertical_id?.replace(/_/g, ' ') || 'Unknown'}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {CHANNEL_ICONS[v.channel] || <Phone className="h-3 w-3" />}
                    <span className="capitalize">{v.channel?.replace('_', ' ')}</span>
                    <span>• {v.call_count} calls</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold ${getScoreColor(v.avg_score)}`}>
                  {v.avg_score?.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">avg score</p>
              </div>
            </div>
            
            {v.low_score_count > 0 && (
              <div className="flex items-center gap-1 text-xs text-red-500 mb-2">
                <AlertTriangle className="h-3 w-3" />
                {v.low_score_count} calls scored below 6.0
              </div>
            )}
            
            {v.top_issues && v.top_issues.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {v.top_issues.slice(0, 3).map((issue) => (
                  <Badge key={issue} variant="outline" className="text-xs">
                    {ISSUE_LABELS[issue] || issue.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}