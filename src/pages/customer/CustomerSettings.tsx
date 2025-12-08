import { Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              AI Configuration
            </CardTitle>
            <CardDescription>
              Here you'll be able to configure your AI settings (voice, knowledge, lead routing, calendar, and deploy).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Settings className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-lg mb-2">
                Settings Coming Soon
              </p>
              <p className="text-sm text-muted-foreground max-w-md">
                Voice settings, knowledge management, lead routing, and calendar configuration will be available here in the next update.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
