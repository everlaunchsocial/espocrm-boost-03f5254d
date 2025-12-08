import { HelpCircle, MessageCircle, Mail, BookOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function CustomerSupport() {
  return (
    <div className="p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Support</h1>
          <p className="text-muted-foreground">
            Get help with your EverLaunch AI assistant
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Knowledge Base
              </CardTitle>
              <CardDescription>
                Browse FAQs and how-to guides
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Find answers to common questions and learn how to get the most out of your AI assistant.
              </p>
              <Button variant="outline" disabled className="w-full">
                Coming Soon
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                Live Chat
              </CardTitle>
              <CardDescription>
                Chat with our support team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Get instant help from our support team during business hours.
              </p>
              <Button variant="outline" disabled className="w-full">
                Coming Soon
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Email Support
              </CardTitle>
              <CardDescription>
                Send us a message
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                For non-urgent inquiries, send us an email and we'll respond within 24 hours.
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.location.href = 'mailto:support@everlaunch.ai'}
              >
                Contact Support
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                Schedule a Call
              </CardTitle>
              <CardDescription>
                Talk to an expert
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Book a one-on-one session with our team to optimize your AI setup.
              </p>
              <Button variant="outline" disabled className="w-full">
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
