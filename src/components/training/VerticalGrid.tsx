import { VerticalTrainingRow } from '@/types/verticalTraining';
import { VerticalCard } from './VerticalCard';
import { Skeleton } from '@/components/ui/skeleton';

interface VerticalGridProps {
  verticals: VerticalTrainingRow[];
  isLoading: boolean;
  onSelectVertical: (vertical: VerticalTrainingRow) => void;
}

export function VerticalGrid({ verticals, isLoading, onSelectVertical }: VerticalGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-[200px] rounded-lg" />
        ))}
      </div>
    );
  }

  if (verticals.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No training content available yet.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {verticals.map((vertical) => (
        <VerticalCard
          key={vertical.id}
          vertical={vertical}
          onClick={() => onSelectVertical(vertical)}
        />
      ))}
    </div>
  );
}
