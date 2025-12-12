import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Target } from "lucide-react";

interface CallAnalysis {
  id: string;
  call_category: string | null;
  overall_score: number | null;
  score_clarity: number | null;
  score_accuracy: number | null;
  score_tone: number | null;
  score_completeness: number | null;
  score_speed: number | null;
  score_objection_handling: number | null;
  score_booking_success: number | null;
  sentiment: string | null;
  suggestions: unknown;
  analyzed_at: string;
}

interface PatternInsightsProps {
  analyses: CallAnalysis[];
}

interface Pattern {
  type: "strength" | "weakness" | "trend";
  title: string;
  description: string;
  metric?: string;
  change?: number;
}

export function PatternInsights({ analyses }: PatternInsightsProps) {
  const patterns = useMemo(() => {
    if (analyses.length < 2) return [];

    const result: Pattern[] = [];
    
    // Calculate averages for each metric
    const metrics = ["clarity", "accuracy", "tone", "completeness", "speed", "objection_handling", "booking_success"];
    const avgScores: Record<string, number> = {};
    
    metrics.forEach(metric => {
      const key = `score_${metric}` as keyof CallAnalysis;
      const values = analyses.map(a => a[key] as number | null).filter((v): v is number => v !== null);
      avgScores[metric] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    });

    // Find strengths (scores > 80)
    Object.entries(avgScores).forEach(([metric, score]) => {
      if (score >= 80) {
        result.push({
          type: "strength",
          title: `Strong ${metric.replace(/_/g, " ")}`,
          description: `Average score of ${score.toFixed(0)}% indicates excellent performance`,
          metric,
        });
      }
    });

    // Find weaknesses (scores < 60)
    Object.entries(avgScores).forEach(([metric, score]) => {
      if (score > 0 && score < 60) {
        result.push({
          type: "weakness",
          title: `Improve ${metric.replace(/_/g, " ")}`,
          description: `Average score of ${score.toFixed(0)}% needs attention`,
          metric,
        });
      }
    });

    // Calculate trends (compare first half to second half)
    if (analyses.length >= 4) {
      const midpoint = Math.floor(analyses.length / 2);
      const recentAnalyses = analyses.slice(0, midpoint);
      const olderAnalyses = analyses.slice(midpoint);

      const recentAvg = recentAnalyses
        .map(a => a.overall_score)
        .filter((v): v is number => v !== null)
        .reduce((a, b) => a + b, 0) / recentAnalyses.length;

      const olderAvg = olderAnalyses
        .map(a => a.overall_score)
        .filter((v): v is number => v !== null)
        .reduce((a, b) => a + b, 0) / olderAnalyses.length;

      const change = recentAvg - olderAvg;
      
      if (Math.abs(change) >= 5) {
        result.push({
          type: "trend",
          title: change > 0 ? "Improving Performance" : "Declining Performance",
          description: `Overall scores ${change > 0 ? "increased" : "decreased"} by ${Math.abs(change).toFixed(1)}% recently`,
          change,
        });
      }
    }

    // Analyze sentiment patterns
    const sentiments = analyses.map(a => a.sentiment).filter(Boolean);
    const negativeSentiments = sentiments.filter(s => s === "negative" || s === "frustrated").length;
    const negativeRate = sentiments.length > 0 ? (negativeSentiments / sentiments.length) * 100 : 0;
    
    if (negativeRate > 30) {
      result.push({
        type: "weakness",
        title: "High Negative Sentiment",
        description: `${negativeRate.toFixed(0)}% of calls have negative sentiment - review AI responses`,
      });
    }

    // Analyze booking success
    const bookingScores = analyses
      .map(a => a.score_booking_success)
      .filter((v): v is number => v !== null);
    
    if (bookingScores.length > 0) {
      const avgBooking = bookingScores.reduce((a, b) => a + b, 0) / bookingScores.length;
      if (avgBooking < 50) {
        result.push({
          type: "weakness",
          title: "Low Booking Conversion",
          description: "Consider adjusting call-to-action prompts and booking flow",
        });
      }
    }

    return result.slice(0, 6); // Limit to 6 patterns
  }, [analyses]);

  const suggestions = useMemo(() => {
    // Aggregate all suggestions from analyses
    const allSuggestions: string[] = [];
    
    analyses.forEach(analysis => {
      if (analysis.suggestions && Array.isArray(analysis.suggestions)) {
        allSuggestions.push(...(analysis.suggestions as string[]));
      }
    });

    // Count frequency of similar suggestions
    const suggestionCounts: Record<string, number> = {};
    allSuggestions.forEach(s => {
      const key = s.toLowerCase().slice(0, 50);
      suggestionCounts[key] = (suggestionCounts[key] || 0) + 1;
    });

    // Return most common unique suggestions
    const uniqueSuggestions = [...new Set(allSuggestions)];
    return uniqueSuggestions.slice(0, 5);
  }, [analyses]);

  if (analyses.length < 2) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Target className="h-5 w-5" />
            Pattern Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Need at least 2 analyzed calls to detect patterns.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Patterns Card */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Target className="h-5 w-5" />
            Detected Patterns
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {patterns.length === 0 ? (
            <p className="text-muted-foreground text-sm">No significant patterns detected yet.</p>
          ) : (
            patterns.map((pattern, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
              >
                {pattern.type === "strength" && (
                  <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
                )}
                {pattern.type === "weakness" && (
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                )}
                {pattern.type === "trend" && (
                  pattern.change && pattern.change > 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-500 mt-0.5" />
                  )
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{pattern.title}</span>
                    <Badge
                      variant={pattern.type === "strength" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {pattern.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {pattern.description}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Auto-Suggestions Card */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Lightbulb className="h-5 w-5" />
            Top Improvement Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {suggestions.length === 0 ? (
            <p className="text-muted-foreground text-sm">No suggestions available yet.</p>
          ) : (
            suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary text-sm font-medium">
                  {idx + 1}
                </span>
                <p className="text-sm text-foreground flex-1">{suggestion}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
