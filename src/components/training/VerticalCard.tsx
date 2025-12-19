import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, Video } from 'lucide-react';
import { VerticalTrainingRow } from '@/types/verticalTraining';

interface VerticalCardProps {
  vertical: VerticalTrainingRow;
  onClick: () => void;
}

export function VerticalCard({ vertical, onClick }: VerticalCardProps) {
  const hasVideo = !!vertical.video_path;

  return (
    <Card 
      className="group relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/50 cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-5">
        {/* Rank Badge */}
        <Badge 
          variant="secondary" 
          className="absolute top-3 right-3 text-xs font-bold"
        >
          #{vertical.rank}
        </Badge>

        {/* Industry Icon Placeholder */}
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
          {hasVideo ? (
            <Video className="h-6 w-6 text-primary" />
          ) : (
            <PlayCircle className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        {/* Industry Name */}
        <h3 className="font-semibold text-lg mb-3 pr-12 line-clamp-2">
          {vertical.industry_name}
        </h3>

        {/* Quick Stats */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          <span>{vertical.pain_points.length} pain points</span>
          <span>•</span>
          <span>{vertical.where_to_find.length} lead sources</span>
        </div>

        {/* CTA Button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
        >
          <PlayCircle className="h-4 w-4 mr-2" />
          View Training
        </Button>

        {/* Video Available Indicator */}
        {hasVideo && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-500/50" />
        )}
      </CardContent>
    </Card>
  );
}
