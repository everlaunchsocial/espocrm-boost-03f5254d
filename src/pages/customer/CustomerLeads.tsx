import { Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CustomerLeads() {
  return (
    <div className="p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-muted-foreground">
            View leads captured by your AI assistant
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Captured Leads
            </CardTitle>
            <CardDescription>
              This page will show leads captured by your AI assistant.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-lg mb-2">
                No Leads Yet
              </p>
              <p className="text-sm text-muted-foreground max-w-md">
                When your AI assistant captures lead information from callers and website visitors, they'll appear here.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
