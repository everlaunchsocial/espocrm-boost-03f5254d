import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  Circle, 
  Mic, 
  BookOpen, 
  Users, 
  Calendar, 
  Rocket,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  link: string;
  isComplete: boolean;
  isOptional?: boolean;
}

interface SetupChecklistProps {
  voiceComplete: boolean;
  knowledgeComplete: boolean;
  leadsComplete: boolean;
  calendarComplete: boolean;
  calendarOptional: boolean;
  deployComplete: boolean;
}

export function SetupChecklist({
  voiceComplete,
  knowledgeComplete,
  leadsComplete,
  calendarComplete,
  calendarOptional,
  deployComplete
}: SetupChecklistProps) {
  const items: ChecklistItem[] = [
    {
      id: 'voice',
      label: "Set your AI's voice & greeting",
      description: "Your AI will sound on-brand and greet callers the right way.",
      link: '/customer/settings/voice',
      isComplete: voiceComplete,
    },
    {
      id: 'knowledge',
      label: "Connect your website & documents",
      description: "Give your AI the knowledge it needs to answer questions.",
      link: '/customer/settings/knowledge',
      isComplete: knowledgeComplete,
    },
    {
      id: 'leads',
      label: "Make sure new leads reach you",
      description: "Configure how and where you get notified about new leads.",
      link: '/customer/settings/leads',
      isComplete: leadsComplete,
    },
    {
      id: 'calendar',
      label: "Connect calendar for bookings",
      description: calendarOptional ? "Optional: Let your AI book meetings for you." : "Let your AI book meetings for you.",
      link: '/customer/settings/calendar',
      isComplete: calendarComplete,
      isOptional: calendarOptional,
    },
    {
      id: 'deploy',
      label: "Deploy your AI on your website and phone",
      description: "Add the embed code and test your AI phone number.",
      link: '/customer/settings/deploy',
      isComplete: deployComplete,
    },
  ];

  const completedCount = items.filter(item => item.isComplete).length;
  const totalCount = items.length;
  const allComplete = completedCount === totalCount;

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
          const Icon = item.id === 'voice' ? Mic 
            : item.id === 'knowledge' ? BookOpen 
            : item.id === 'leads' ? Users 
            : item.id === 'calendar' ? Calendar 
            : Rocket;

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
