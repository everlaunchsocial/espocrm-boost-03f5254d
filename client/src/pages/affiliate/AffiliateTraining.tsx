import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  GraduationCap, 
  UserPlus, 
  Presentation, 
  DollarSign, 
  Mail, 
  Target,
  PlayCircle,
  FileText,
  CheckCircle2
} from 'lucide-react';

const trainingModules = [
  {
    title: 'Getting Started',
    icon: GraduationCap,
    lessons: [
      { title: 'Welcome to EverLaunch', completed: false },
      { title: 'Understanding the Platform', completed: false },
      { title: 'Setting Up Your Profile', completed: false },
    ],
  },
  {
    title: 'Finding Leads',
    icon: UserPlus,
    lessons: [
      { title: 'How to Add a Lead', completed: false },
      { title: 'Importing Leads in Bulk', completed: false },
      { title: 'Lead Qualification Tips', completed: false },
    ],
  },
  {
    title: 'Creating Demos',
    icon: Presentation,
    lessons: [
      { title: 'How to Create a Demo', completed: false },
      { title: 'Customizing AI Prompts', completed: false },
      { title: 'Sending Demo Emails', completed: false },
    ],
  },
  {
    title: 'Closing Sales',
    icon: Target,
    lessons: [
      { title: 'Following Up with Prospects', completed: false },
      { title: 'Handling Objections', completed: false },
      { title: 'Closing Techniques', completed: false },
    ],
  },
  {
    title: 'Email Best Practices',
    icon: Mail,
    lessons: [
      { title: 'Writing Effective Subject Lines', completed: false },
      { title: 'Email Templates That Convert', completed: false },
      { title: 'Following Up Strategically', completed: false },
    ],
  },
  {
    title: 'Commissions & Payouts',
    icon: DollarSign,
    lessons: [
      { title: 'How Commissions Work', completed: false },
      { title: 'Understanding Tiers', completed: false },
      { title: 'Payout Schedule & Methods', completed: false },
    ],
  },
];

export default function AffiliateTraining() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">How-To & Training</h1>
        <p className="text-muted-foreground">Learn everything you need to succeed as an EverLaunch affiliate</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {trainingModules.map((module) => (
          <Card key={module.title} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <module.icon className="h-5 w-5 text-primary" />
                {module.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {module.lessons.map((lesson) => (
                  <li key={lesson.title} className="flex items-center gap-2 text-sm">
                    {lesson.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <PlayCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={lesson.completed ? 'text-muted-foreground line-through' : ''}>
                      {lesson.title}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Resources & Downloads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">Training materials coming soon</h3>
            <p className="text-muted-foreground max-w-sm mt-2">
              We're preparing comprehensive training videos, scripts, and resources to help you succeed.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
