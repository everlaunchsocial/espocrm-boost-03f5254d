import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  Circle, 
  Building2,
  Mic, 
  BookOpen, 
  UserPlus, 
  Calendar, 
  Rocket,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface ChecklistItem {
  id: string;
  stepNumber: number;
  label: string;
  description: string;
  link: string;
  isComplete: boolean;
  isOptional?: boolean;
}

interface SetupChecklistProps {
  // Step 1: Business Profile
  businessProfileComplete: boolean;
  // Step 2: Voice & Personality
  voiceComplete: boolean;
  // Step 3: Knowledge & Content
  knowledgeComplete: boolean;
  // Step 4: Lead Capture
  leadsComplete: boolean;
  // Step 5: Calendar
  calendarComplete: boolean;
  calendarOptional: boolean;
  // Step 6: Deploy
  deployComplete: boolean;
}

export function SetupChecklist({
  businessProfileComplete,
  voiceComplete,
  knowledgeComplete,
  leadsComplete,
  calendarComplete,
  calendarOptional,
  deployComplete
}: SetupChecklistProps) {
  // Steps must match onboarding wizard exactly
  const items: ChecklistItem[] = [
    {
      id: 'business-profile',
      stepNumber: 1,
      label: "Business Profile",
      description: "Tell us about your business so we can personalize your AI assistant.",
      link: '/customer/onboarding/wizard/1',
      isComplete: businessProfileComplete,
    },
    {
      id: 'voice',
      stepNumber: 2,
      label: "Voice & Personality",
      description: "Choose your AI assistant's voice and greeting message.",
      link: '/customer/onboarding/wizard/2',
      isComplete: voiceComplete,
    },
    {
      id: 'knowledge',
      stepNumber: 3,
      label: "Knowledge & Content",
      description: "Help your AI learn about your business from your website and documents.",
      link: '/customer/onboarding/wizard/3',
      isComplete: knowledgeComplete,
    },
    {
      id: 'leads',
      stepNumber: 4,
      label: "Lead Capture",
      description: "Configure how you receive leads and notifications.",
      link: '/customer/onboarding/wizard/4',
      isComplete: leadsComplete,
    },
    {
      id: 'calendar',
      stepNumber: 5,
      label: "Calendar",
      description: calendarOptional ? "Optional: Let your AI book appointments for you." : "Let your AI book appointments for you.",
      link: '/customer/onboarding/wizard/5',
      isComplete: calendarComplete,
      isOptional: calendarOptional,
    },
    {
      id: 'deploy',
      stepNumber: 6,
      label: "Deploy",
      description: "Add the embed code and test your AI phone number.",
      link: '/customer/onboarding/wizard/6',
      isComplete: deployComplete,
    },
  ];

  const completedCount = items.filter(item => item.isComplete).length;
  const totalCount = items.length;
  const allComplete = completedCount === totalCount;

  // Get icon for each step
  const getStepIcon = (id: string) => {
    switch (id) {
      case 'business-profile': return Building2;
      case 'voice': return Mic;
      case 'knowledge': return BookOpen;
      case 'leads': return UserPlus;
      case 'calendar': return Calendar;
      case 'deploy': return Rocket;
      default: return Rocket;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          {allComplete ? "You're all set!" : "Setup Checklist"}
        </CardTitle>
        <CardDescription>
          {allComplete 
            ? "Your AI assistant is fully configured and ready to go."
            : `${completedCount} of ${totalCount} steps complete`
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => {
          const Icon = getStepIcon(item.id);

          return (
            <div
              key={item.id}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                item.isComplete 
                  ? 'bg-success/5 border-success/20' 
                  : 'bg-muted/30 border-border hover:bg-muted/50'
              }`}
            >
              <div className="mt-0.5">
                {item.isComplete ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    Step {item.stepNumber}
                  </span>
                  <Icon className="h-4 w-4 text-primary shrink-0" />
                  <span className={`font-medium text-sm ${item.isComplete ? 'text-success' : 'text-foreground'}`}>
                    {item.label}
                  </span>
                  {item.isOptional && !item.isComplete && (
                    <span className="text-xs text-muted-foreground">(Optional)</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
              </div>
              <Button variant="ghost" size="sm" asChild className="shrink-0">
                <Link to={item.link}>
                  {item.isComplete ? 'Edit' : 'Set up'}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
