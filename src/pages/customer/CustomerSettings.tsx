import { Link } from 'react-router-dom';
import { Settings, Mic, BookOpen, Users, Calendar, Code } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SettingsLink {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  available: boolean;
}

const settingsLinks: SettingsLink[] = [
  {
    title: 'Voice & Personality',
    description: 'Configure voice gender, style, greeting, and response pace',
    href: '/customer/settings/voice',
    icon: Mic,
    available: true,
  },
  {
    title: 'Knowledge & Content',
    description: 'Manage website knowledge and uploaded documents',
    href: '/customer/settings/knowledge',
    icon: BookOpen,
    available: true,
  },
  {
    title: 'Lead Capture & Routing',
    description: 'Set up how leads are captured and where they go',
    href: '/customer/settings/leads',
    icon: Users,
    available: true,
  },
  {
    title: 'Calendar & Appointments',
    description: 'Connect calendar and configure booking availability',
    href: '/customer/settings/calendar',
    icon: Calendar,
    available: false,
  },
  {
    title: 'Deploy & Embed',
    description: 'Get your embed code and phone number',
    href: '/customer/settings/deploy',
    icon: Code,
    available: false,
  },
];

export default function CustomerSettings() {
  return (
    <div className="p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">
            Configure your AI assistant
          </p>
        </div>

        <div className="grid gap-4">
          {settingsLinks.map((link) => {
            const Icon = link.icon;
            
            if (!link.available) {
              return (
                <Card key={link.href} className="opacity-60">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          {link.title}
                          <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            Coming soon
                          </span>
                        </CardTitle>
                        <CardDescription className="mt-0.5">
                          {link.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            }

            return (
              <Link key={link.href} to={link.href}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base">{link.title}</CardTitle>
                        <CardDescription className="mt-0.5">
                          {link.description}
                        </CardDescription>
                      </div>
                      <div className="text-muted-foreground">
                        →
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
