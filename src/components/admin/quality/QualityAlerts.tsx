import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Bell, CheckCircle, Eye, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface QualityAlert {
  id: string;
  created_at: string;
  resolved_at: string | null;
  alert_type: string;
  severity: string;
  customer_id: string | null;
  call_analysis_id: string | null;
  vertical_id: string | null;
  channel: string | null;
  threshold_value: number | null;
  actual_value: number | null;
  message: string;
  metadata: Record<string, unknown> | null;
}

interface QualityAlertsProps {
  limit?: number;
  showResolved?: boolean;
  onViewAnalysis?: (analysisId: string) => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500 text-white',
  warning: 'bg-yellow-500 text-black',
  info: 'bg-blue-500 text-white',
};

const ALERT_TYPE_ICONS: Record<string, React.ReactNode> = {
  low_score: <AlertTriangle className="h-4 w-4" />,
  compliance_risk: <AlertTriangle className="h-4 w-4" />,
  pattern_detected: <Bell className="h-4 w-4" />,
  threshold_breach: <AlertTriangle className="h-4 w-4" />,
};

export function QualityAlerts({ limit = 10, showResolved = false, onViewAnalysis }: QualityAlertsProps) {
  const queryClient = useQueryClient();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['quality-alerts', limit, showResolved],
    queryFn: async () => {
      let query = supabase
        .from('quality_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (!showResolved) {
        query = query.is('resolved_at', null);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as QualityAlert[];
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('quality_alerts')
        .update({ resolved_at: new Date().toISOString() })
        .eq('id', alertId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-alerts'] });
      toast.success('Alert resolved');
    },
    onError: (error) => {
      toast.error('Failed to resolve alert');
      console.error(error);
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5" />
            Quality Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const unresolvedCount = alerts?.filter(a => !a.resolved_at).length || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5" />
            Quality Alerts
            {unresolvedCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unresolvedCount} unresolved
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!alerts?.length ? (
          <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg">
            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="font-medium text-green-500">No active alerts!</p>
              <p className="text-sm text-muted-foreground">All quality metrics are within acceptable ranges.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div 
                key={alert.id}
                className={`p-4 rounded-lg border ${
                  alert.resolved_at 
                    ? 'bg-muted/30 border-muted' 
                    : alert.severity === 'critical' 
                      ? 'bg-red-500/10 border-red-500/30' 
                      : 'bg-yellow-500/10 border-yellow-500/30'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${
                      alert.resolved_at 
                        ? 'bg-muted' 
                        : SEVERITY_COLORS[alert.severity]?.replace('text-', 'text-white').split(' ')[0]
                    }`}>
                      {alert.resolved_at 
                        ? <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        : ALERT_TYPE_ICONS[alert.alert_type]
                      }
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge className={alert.resolved_at ? 'bg-muted' : SEVERITY_COLORS[alert.severity]}>
                          {alert.severity}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {alert.alert_type.replace(/_/g, ' ')}
                        </Badge>
                        {alert.vertical_id && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {alert.vertical_id.replace(/_/g, ' ')}
                          </Badge>
                        )}
                      </div>
                      <p className={`text-sm ${alert.resolved_at ? 'text-muted-foreground' : ''}`}>
                        {alert.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(alert.created_at), 'MMM d, h:mm a')}
                        {alert.resolved_at && (
                          <span className="ml-2">
                            • Resolved {format(new Date(alert.resolved_at), 'MMM d, h:mm a')}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {alert.call_analysis_id && onViewAnalysis && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewAnalysis(alert.call_analysis_id!)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {!alert.resolved_at && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resolveMutation.mutate(alert.id)}
                        disabled={resolveMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}