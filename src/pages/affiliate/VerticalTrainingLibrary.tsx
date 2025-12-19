import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, BookOpen } from 'lucide-react';
import { useVerticalTraining } from '@/hooks/useVerticalTraining';
import { VerticalGrid } from '@/components/training/VerticalGrid';
import { VerticalTrainingModal } from '@/components/training/VerticalTrainingModal';
import { VerticalTrainingRow } from '@/types/verticalTraining';

export default function VerticalTrainingLibrary() {
  const { verticals, isLoading, error, getSignedVideoUrl } = useVerticalTraining();
  const [selectedVertical, setSelectedVertical] = useState<VerticalTrainingRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelectVertical = (vertical: VerticalTrainingRow) => {
    setSelectedVertical(vertical);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Keep selectedVertical until animation completes
    setTimeout(() => setSelectedVertical(null), 200);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vertical Training Library</h1>
        <p className="text-muted-foreground">
          Master the art of selling Phone AI to specific industries
        </p>
      </div>

      {/* Overview Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">Industry-Specific Training</h3>
              <p className="text-sm text-muted-foreground">
                {verticals.length} verticals available • Each includes video training, pain points, and lead generation strategies
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span>Click any card to view training</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4 text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Vertical Grid */}
      <VerticalGrid
        verticals={verticals}
        isLoading={isLoading}
        onSelectVertical={handleSelectVertical}
      />

      {/* Training Modal */}
      <VerticalTrainingModal
        vertical={selectedVertical}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        getSignedVideoUrl={getSignedVideoUrl}
      />
    </div>
  );
}
