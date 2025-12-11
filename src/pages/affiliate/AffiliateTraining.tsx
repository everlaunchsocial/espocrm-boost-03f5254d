import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  GraduationCap, 
  Rocket,
  TrendingUp,
  BookOpen,
  Megaphone,
  Trophy,
  ChevronRight,
  CheckCircle2,
  PlayCircle
} from 'lucide-react';
import { useTraining, TrainingModule } from '@/hooks/useTraining';
import { TrainingModuleCard } from '@/components/training/TrainingModuleCard';
import { TrainingViewer } from '@/components/training/TrainingViewer';

// Icon mapping for categories
const categoryIcons: Record<string, React.ElementType> = {
  'rocket': Rocket,
  'trending-up': TrendingUp,
  'book-open': BookOpen,
  'megaphone': Megaphone,
  'trophy': Trophy,
};

export default function AffiliateTraining() {
  const {
    categories,
    modules,
    isLoading,
    getModuleProgress,
    getModulesByCategory,
    getCategoryProgress,
    startModule,
    updateProgress,
    markComplete,
    totalModules,
    completedModules,
    overallProgress,
  } = useTraining();

  const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const handleModuleClick = async (module: TrainingModule) => {
    await startModule(module.id);
    setSelectedModule(module);
  };

  const handleBack = () => {
    setSelectedModule(null);
  };

  const handleProgress = (moduleId: string) => async (percent: number, positionSeconds?: number) => {
    await updateProgress(moduleId, percent, positionSeconds);
  };

  const handleComplete = (moduleId: string) => async () => {
    await markComplete(moduleId);
  };

  // Show viewer if module is selected
  if (selectedModule) {
    const progress = getModuleProgress(selectedModule.id);
    return (
      <TrainingViewer
        module={selectedModule}
        progress={progress}
        onBack={handleBack}
        onProgress={handleProgress(selectedModule.id)}
        onComplete={handleComplete(selectedModule.id)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">How-To & Training</h1>
        <p className="text-muted-foreground">Learn everything you need to succeed as an EverLaunch affiliate</p>
      </div>

      {/* Overall Progress Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Your Training Progress</h3>
                <p className="text-sm text-muted-foreground">
                  {completedModules} of {totalModules} modules completed
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-primary">{overallProgress}%</span>
            </div>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </CardContent>
      </Card>

      {/* Categories with Modules */}
      {categories.length > 0 ? (
        <div className="space-y-6">
          {categories.map((category) => {
            const Icon = categoryIcons[category.icon || 'book-open'] || BookOpen;
            const categoryModules = getModulesByCategory(category.id);
            const { completed, total, percent } = getCategoryProgress(category.id);
            const isExpanded = expandedCategory === category.id || categories.length <= 3;

            if (categoryModules.length === 0) return null;

            return (
              <Card key={category.id}>
                <CardHeader 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <span>{category.name}</span>
                        {category.description && (
                          <p className="text-sm font-normal text-muted-foreground">
                            {category.description}
                          </p>
                        )}
                      </div>
                    </CardTitle>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-sm font-medium">{completed}/{total}</span>
                        <p className="text-xs text-muted-foreground">completed</p>
                      </div>
                      {percent === 100 ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <ChevronRight className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      )}
                    </div>
                  </div>
                  {total > 0 && (
                    <Progress value={percent} className="h-1.5 mt-3" />
                  )}
                </CardHeader>
                
                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {categoryModules.map((module) => (
                        <TrainingModuleCard
                          key={module.id}
                          module={module}
                          progress={getModuleProgress(module.id)}
                          onClick={() => handleModuleClick(module)}
                        />
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        /* Empty state when no modules exist */
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <PlayCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">Training Content Coming Soon</h3>
              <p className="text-muted-foreground max-w-md">
                We're preparing comprehensive training videos, guides, and resources to help you succeed as an EverLaunch affiliate. Check back soon!
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
