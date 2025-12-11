import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { 
  GraduationCap, 
  Rocket,
  TrendingUp,
  BookOpen,
  Megaphone,
  Trophy,
  ChevronRight,
  PlayCircle,
  Settings,
  Phone,
  MessageSquare,
  Video,
  FileText,
  File,
  Clock
} from 'lucide-react';
import { useCustomerTraining, TrainingModule } from '@/hooks/useCustomerTraining';
import { TrainingViewer } from '@/components/training/TrainingViewer';

// Icon mapping for categories
const categoryIcons: Record<string, React.ElementType> = {
  'rocket': Rocket,
  'trending-up': TrendingUp,
  'book-open': BookOpen,
  'megaphone': Megaphone,
  'trophy': Trophy,
  'settings': Settings,
  'phone': Phone,
  'message-square': MessageSquare,
};

const contentTypeIcons: Record<string, React.ElementType> = {
  video: Video,
  article: FileText,
  pdf: File,
  quiz: BookOpen,
};

export default function CustomerTraining() {
  const {
    categories,
    modules,
    isLoading,
    getModulesByCategory,
    totalModules,
  } = useCustomerTraining();

  const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const handleModuleClick = (module: TrainingModule) => {
    setSelectedModule(module);
  };

  const handleBack = () => {
    setSelectedModule(null);
  };

  // Show viewer if module is selected
  if (selectedModule) {
    return (
      <div className="p-6">
        <TrainingViewer
          module={selectedModule}
          progress={undefined}
          onBack={handleBack}
          onProgress={() => {}}
          onComplete={() => {}}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Learn & Get Started</h1>
        <p className="text-muted-foreground">Learn how to get the most from your AI assistant</p>
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Training Library</h3>
              <p className="text-sm text-muted-foreground">
                {totalModules} tutorials available to help you succeed
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories with Modules */}
      {categories.length > 0 && modules.length > 0 ? (
        <div className="space-y-6">
          {categories.map((category) => {
            const Icon = categoryIcons[category.icon || 'book-open'] || BookOpen;
            const categoryModules = getModulesByCategory(category.id);
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
                      <span className="text-sm text-muted-foreground">
                        {categoryModules.length} {categoryModules.length === 1 ? 'tutorial' : 'tutorials'}
                      </span>
                      <ChevronRight className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {categoryModules.map((module) => {
                        const ContentIcon = contentTypeIcons[module.content_type] || FileText;
                        return (
                          <Card
                            key={module.id}
                            className="cursor-pointer hover:border-primary/50 transition-colors"
                            onClick={() => handleModuleClick(module)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                  <ContentIcon className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm truncate">{module.title}</h4>
                                  {module.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                      {module.description}
                                    </p>
                                  )}
                                  {module.duration_minutes && (
                                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                                      <Clock className="h-3 w-3" />
                                      <span>{module.duration_minutes} min</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
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
                We're preparing comprehensive tutorials and guides to help you get the most from your AI assistant. Check back soon!
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
