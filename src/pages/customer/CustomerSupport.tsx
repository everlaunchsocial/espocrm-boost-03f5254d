import { HelpCircle, MessageCircle, Mail, BookOpen, Phone, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function CustomerSupport() {
  const navigate = useNavigate();

  // Trigger the chat widget by simulating a click on the floating button
  const openChatWidget = () => {
    // The SupportChatWidget is rendered in CustomerPortalLayout
    // We can dispatch a custom event to open it
    const chatButton = document.querySelector('[data-support-chat-trigger]');
    if (chatButton) {
      (chatButton as HTMLElement).click();
    } else {
      // Fallback - scroll to bottom right where widget is
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
  };

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
                Training Center
              </CardTitle>
              <CardDescription>
                Learn how to get the most from your AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Access tutorials, guides, and best practices for setting up and optimizing your AI assistant.
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/customer/training')}
              >
                View Training
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
                Chat with our AI support assistant
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Get instant answers to common questions using our AI-powered chat support.
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={openChatWidget}
              >
                Open Chat
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
                For detailed inquiries, send us an email and we'll respond within 24 hours.
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
                <Phone className="h-5 w-5 text-primary" />
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
