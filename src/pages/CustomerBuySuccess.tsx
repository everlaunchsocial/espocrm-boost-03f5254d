import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  ArrowRight,
  Clock,
  Phone,
  MessageSquare,
  Calendar,
} from 'lucide-react';

interface PlanDetails {
  name: string;
  monthlyPrice: number;
  setupFee: number;
  minutesIncluded: number;
}

export default function CustomerBuySuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [planDetails, setPlanDetails] = useState<PlanDetails | null>(null);

  const planCode = searchParams.get('plan');
  const customerId = searchParams.get('customerId');

  useEffect(() => {
    const fetchPlanDetails = async () => {
      if (!planCode) return;

      const { data, error } = await supabase
        .from('customer_plans')
        .select('name, monthly_price, setup_fee, minutes_included')
        .eq('code', planCode)
        .single();

      if (!error && data) {
        setPlanDetails({
          name: data.name,
          monthlyPrice: Number(data.monthly_price),
          setupFee: Number(data.setup_fee),
          minutesIncluded: data.minutes_included,
        });
      }
    };

    fetchPlanDetails();
  }, [planCode]);

  const nextSteps = [
    {
      icon: Phone,
      title: 'Phone Number Setup',
      description: 'We\'ll assign a dedicated phone number for your AI assistant.',
    },
    {
      icon: MessageSquare,
      title: 'AI Training',
      description: 'Your AI will be customized to understand your business.',
    },
    {
      icon: Calendar,
      title: 'Go Live',
      description: 'Your AI assistant will be ready to handle calls and chats.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">E</span>
            </div>
            <span className="text-xl font-semibold">EverLaunch AI</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16 max-w-3xl">
        {/* Success Message */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 mb-6">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            You're In! We're Setting Up Your AI Assistant
          </h1>
          <p className="text-xl text-muted-foreground">
            Your account has been created. Our team will activate your service shortly.
          </p>
        </div>

        {/* Plan Summary Card */}
        {planDetails && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Your Plan</CardTitle>
                <Badge variant="secondary">{planDetails.name}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-primary">
                    ${planDetails.monthlyPrice}
                  </div>
                  <div className="text-sm text-muted-foreground">per month</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">
                    {planDetails.minutesIncluded}
                  </div>
                  <div className="text-sm text-muted-foreground">minutes included</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-muted-foreground">
                    ${planDetails.setupFee}
                  </div>
                  <div className="text-sm text-muted-foreground">setup fee (pending)</div>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-green-600 dark:text-green-400">
                      Payment Received
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your payment has been processed successfully. 
                      Our team will now begin setting up your AI assistant.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Next Steps */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>What Happens Next?</CardTitle>
            <CardDescription>
              Our team will get your AI assistant ready for action.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {nextSteps.map((step, index) => (
                <div key={step.title} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <step.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Step {index + 1}
                      </span>
                    </div>
                    <div className="font-medium">{step.title}</div>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center space-y-4">
          <Button size="lg" onClick={() => navigate('/customer/usage')}>
            Go to Your Dashboard
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <p className="text-sm text-muted-foreground">
            Questions? Email us at{' '}
            <a href="mailto:support@everlaunch.ai" className="text-primary hover:underline">
              support@everlaunch.ai
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
