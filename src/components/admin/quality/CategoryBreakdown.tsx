import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface CallAnalysis {
  call_category: string | null;
  overall_score: number | null;
}

interface CategoryBreakdownProps {
  analyses: CallAnalysis[];
}

const CATEGORY_COLORS: Record<string, string> = {
  "general_inquiry": "#3B82F6",
  "appointment_booking": "#22C55E",
  "complaint": "#EF4444",
  "support": "#F59E0B",
  "sales": "#8B5CF6",
  "other": "#6B7280",
};

export function CategoryBreakdown({ analyses }: CategoryBreakdownProps) {
  const categoryData = useMemo(() => {
    const categories: Record<string, { count: number; totalScore: number }> = {};
    
    analyses.forEach(analysis => {
      const category = analysis.call_category || "other";
      if (!categories[category]) {
        categories[category] = { count: 0, totalScore: 0 };
      }
      categories[category].count++;
      if (analysis.overall_score) {
        categories[category].totalScore += analysis.overall_score;
      }
    });

    return Object.entries(categories).map(([name, data]) => ({
      name: name.replace(/_/g, " "),
      value: data.count,
      avgScore: data.count > 0 ? Math.round(data.totalScore / data.count) : 0,
      color: CATEGORY_COLORS[name] || CATEGORY_COLORS["other"],
    }));
  }, [analyses]);

  const totalCalls = analyses.length;

  if (analyses.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Pie Chart */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Call Distribution by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`${value} calls`, "Count"]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Category Performance */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Performance by Category</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {categoryData.map((category) => (
            <div key={category.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-sm font-medium text-foreground capitalize">
                    {category.name}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{category.value} calls ({Math.round((category.value / totalCalls) * 100)}%)</span>
                  <span className="font-medium text-foreground">{category.avgScore}%</span>
                </div>
              </div>
              <Progress value={category.avgScore} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
