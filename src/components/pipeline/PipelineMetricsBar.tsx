import { DollarSign, TrendingUp, Users, Target } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface PipelineMetrics {
  totalLeads: number;
  totalValue: number;
  weightedValue: number;
  stageCounts: Record<string, number>;
}

interface PipelineMetricsBarProps {
  metrics: PipelineMetrics;
}

export function PipelineMetricsBar({ metrics }: PipelineMetricsBarProps) {
  const openLeads = metrics.totalLeads - (metrics.stageCounts.closed_won || 0) - (metrics.stageCounts.closed_lost || 0);
  const closeRate = metrics.totalLeads > 0 
    ? Math.round(((metrics.stageCounts.closed_won || 0) / metrics.totalLeads) * 100) 
    : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{openLeads}</p>
            <p className="text-xs text-muted-foreground">Open Leads</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              ${metrics.totalValue.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Pipeline Value</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              ${Math.round(metrics.weightedValue).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Weighted Value</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <Target className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{closeRate}%</p>
            <p className="text-xs text-muted-foreground">Close Rate</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
