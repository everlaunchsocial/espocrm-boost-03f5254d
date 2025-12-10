import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail } from 'lucide-react';

interface EmailPreviewProps {
  recipientName: string;
  businessName: string;
  demoUrl: string;
  senderName: string;
}

export function EmailPreview({ recipientName, businessName, demoUrl, senderName }: EmailPreviewProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-4 w-4" />
          Email Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Email Header */}
        <div className="border-b border-border px-4 py-3 bg-muted/30 space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground font-medium w-16">From:</span>
            <span className="text-foreground">{senderName} &lt;info@send.everlaunch.ai&gt;</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground font-medium w-16">Subject:</span>
            <span className="text-foreground font-medium">Your Personalized AI Receptionist Demo is Ready!</span>
          </div>
        </div>

        {/* Email Body */}
        <div className="p-4 space-y-4 text-sm">
          <p className="text-foreground">
            Hi {recipientName || 'there'},
          </p>

          <p className="text-foreground">
            As promised, here's your personalized AI demo for <strong>{businessName}</strong>:
          </p>

          <p>
            <a 
              href={demoUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              👉 View your personalized, custom AI demo here.
            </a>
          </p>

          <p className="text-foreground">
            This real-time simulation shows how AI Chat and AI Voice can work together to turn 
            your website into a lead-capturing powerhouse — instantly engaging your visitors 
            and inbound callers, 24/7.
          </p>

          <div className="space-y-1 text-foreground">
            <p>✅ It's smart.</p>
            <p>✅ It's conversational.</p>
            <p>✅ It works around the clock — like an extra team member that never sleeps.</p>
          </div>

          <p className="text-foreground">
            Here's the reality: prospects have short attention spans and want answers fast. 
            If they don't get them, they leave — or worse, go to your competitors.
          </p>

          <p className="text-foreground">
            Our AI assistants respond immediately with no delay, keeping leads engaged while 
            collecting their contact info, interests, and even qualifying details so your team 
            can follow up — or let the AI handle it.
          </p>

          <p className="text-foreground">
            Once you're a customer, we custom-build your AI assistants using the full 
            knowledge base of your business so they can:
          </p>

          <ul className="list-disc list-inside space-y-1 text-foreground ml-2">
            <li>Answer specific questions about your services</li>
            <li>Book appointments or consultations</li>
            <li>Transfer live calls to your team</li>
            <li>And keep your pipeline full — even after hours</li>
          </ul>

          <div className="pt-4 border-t border-border mt-4">
            <p className="text-muted-foreground text-xs">
              Questions? Reply to this email or contact us anytime.
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              Powered by EverLaunch AI • AI that works while you sleep
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
