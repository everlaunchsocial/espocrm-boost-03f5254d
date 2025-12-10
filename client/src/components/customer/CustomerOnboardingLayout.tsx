import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCustomerOnboarding } from '@/hooks/useCustomerOnboarding';
import { Skeleton } from '@/components/ui/skeleton';

interface CustomerOnboardingLayoutProps {
  children: ReactNode;
  currentStep: number;
}

const steps = [
  { number: 1, title: 'Business Profile' },
  { number: 2, title: 'Voice & Personality' },
  { number: 3, title: 'Knowledge & Content' },
  { number: 4, title: 'Lead Capture' },
  { number: 5, title: 'Calendar' },
  { number: 6, title: 'Deploy' },
];

export function CustomerOnboardingLayout({ children, currentStep }: CustomerOnboardingLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading, customerProfile, isOnboardingComplete } = useCustomerOnboarding();

  useEffect(() => {
    if (!isLoading && customerProfile) {
      // If onboarding is complete, redirect to dashboard
      if (isOnboardingComplete && location.pathname.includes('/onboarding')) {
        navigate('/customer/dashboard');
        return;
      }

      // If not on the correct step, redirect to the current step
      const savedStep = customerProfile.onboarding_current_step || 1;
      const pathStep = parseInt(location.pathname.split('/').pop() || '1');
      
      // Allow going back to previous steps but not forward beyond current progress
      if (pathStep > savedStep + 1) {
        navigate(`/customer/onboarding/wizard/${savedStep}`);
      }
    }
  }, [isLoading, customerProfile, isOnboardingComplete, navigate, location.pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-12 w-64 mx-auto mb-8" />
          <div className="flex justify-center mb-12">
            <div className="flex items-center gap-4">
              {steps.map((_, i) => (
                <Skeleton key={i} className="h-10 w-10 rounded-full" />
              ))}
            </div>
          </div>
          <Skeleton className="h-96 max-w-2xl mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground text-center">
            EverLaunch AI Setup
          </h1>
          <p className="text-muted-foreground text-center mt-1">
            Let's get your AI assistant ready
          </p>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-center">
            <nav className="flex items-center gap-2 md:gap-4">
              {steps.map((step, index) => {
                const isComplete = currentStep > step.number;
                const isCurrent = currentStep === step.number;
                const isAccessible = step.number <= (customerProfile?.onboarding_current_step || 1) + 1;

                return (
                  <div key={step.number} className="flex items-center">
                    <button
                      onClick={() => isAccessible && navigate(`/customer/onboarding/wizard/${step.number}`)}
                      disabled={!isAccessible}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
                        isCurrent && "bg-primary text-primary-foreground",
                        isComplete && "bg-primary/20 text-primary hover:bg-primary/30",
                        !isCurrent && !isComplete && isAccessible && "text-muted-foreground hover:bg-muted",
                        !isAccessible && "text-muted-foreground/50 cursor-not-allowed"
                      )}
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2",
                          isCurrent && "border-primary-foreground bg-primary-foreground text-primary",
                          isComplete && "border-primary bg-primary text-primary-foreground",
                          !isCurrent && !isComplete && "border-muted-foreground/30"
                        )}
                      >
                        {isComplete ? <Check className="h-4 w-4" /> : step.number}
                      </div>
                      <span className="hidden md:inline text-sm font-medium">
                        {step.title}
                      </span>
                    </button>
                    {index < steps.length - 1 && (
                      <div
                        className={cn(
                          "w-8 md:w-12 h-0.5 mx-1",
                          isComplete ? "bg-primary" : "bg-border"
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
