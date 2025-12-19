import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, BookOpen, Search, PlayCircle, Video, Filter, Loader2 } from 'lucide-react';
import { useAffiliateTraining, AffiliateTrainingEntry } from '@/hooks/useAffiliateTraining';
import { TrainingLibraryModal } from '@/components/training/TrainingLibraryModal';
import { TRAINING_TYPE_LABELS, TRAINING_TYPE_COLORS, TrainingType } from '@/types/trainingLibrary';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function VerticalTrainingLibrary() {
  const { trainings, verticalKeys, trainingTypes, isLoading, error, getSignedVideoUrl } = useAffiliateTraining();
  const [selectedTraining, setSelectedTraining] = useState<AffiliateTrainingEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [verticalFilter, setVerticalFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const handleSelectTraining = (training: AffiliateTrainingEntry) => {
    setSelectedTraining(training);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedTraining(null), 200);
  };

  // Filter trainings
  const filteredTrainings = trainings.filter((training) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!training.title.toLowerCase().includes(query) && 
          !(training.vertical_key?.toLowerCase().includes(query))) {
        return false;
      }
    }
    // Vertical filter
    if (verticalFilter !== 'all') {
      if (verticalFilter === '__general__') {
        if (training.vertical_key) return false;
      } else {
        if (training.vertical_key !== verticalFilter) return false;
      }
    }
    // Type filter
    if (typeFilter !== 'all' && training.training_type !== typeFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Training Library</h1>
        <p className="text-muted-foreground">
          Master the art of selling Phone AI with industry-specific and general training
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
              <h3 className="font-semibold text-lg">Complete Training System</h3>
              <p className="text-sm text-muted-foreground">
                {trainings.length} trainings available • Core, advanced, and specialty modules
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span>Click any card to view training</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search trainings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={verticalFilter} onValueChange={setVerticalFilter}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by vertical..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Verticals</SelectItem>
            <SelectItem value="__general__">General (Non-Vertical)</SelectItem>
            {verticalKeys.map((key) => (
              <SelectItem key={key} value={key} className="capitalize">
                {key.replace(/-/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {trainingTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {TRAINING_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4 text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-[220px] rounded-lg" />
          ))}
        </div>
      )}

      {/* Training Grid */}
      {!isLoading && filteredTrainings.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No trainings match your filters.</p>
        </div>
      )}

      {!isLoading && filteredTrainings.length > 0 && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTrainings.map((training) => (
            <TrainingCard 
              key={training.id} 
              training={training} 
              onClick={() => handleSelectTraining(training)}
            />
          ))}
        </div>
      )}

      {/* Training Modal */}
      <TrainingLibraryModal
        training={selectedTraining}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        getSignedVideoUrl={getSignedVideoUrl}
      />
    </div>
  );
}

// Training Card Component
function TrainingCard({ training, onClick }: { training: AffiliateTrainingEntry; onClick: () => void }) {
  return (
    <Card 
      className="group relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/50 cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-5">
        {/* Training Type Badge */}
        <Badge 
          className={`absolute top-3 right-3 text-xs ${TRAINING_TYPE_COLORS[training.training_type]}`}
        >
          {TRAINING_TYPE_LABELS[training.training_type]}
        </Badge>

        {/* Icon */}
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
          {training.hasVideo ? (
            <Video className="h-6 w-6 text-primary" />
          ) : (
            <PlayCircle className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-lg mb-2 pr-20 line-clamp-2">
          {training.title}
        </h3>

        {/* Vertical Badge */}
        {training.vertical_key && (
          <Badge variant="outline" className="mb-3 capitalize text-xs">
            {training.vertical_key.replace(/-/g, ' ')}
          </Badge>
        )}

        {/* Quick Stats */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          <span>{training.pain_points.length} pain points</span>
          <span>•</span>
          <span>{training.where_to_find.length} lead sources</span>
        </div>

        {/* CTA Button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
        >
          <PlayCircle className="h-4 w-4 mr-2" />
          {training.hasVideo ? 'Watch Training' : 'View Content'}
        </Button>

        {/* Video Available Indicator */}
        {training.hasVideo && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-500/50" />
        )}
      </CardContent>
    </Card>
  );
}
