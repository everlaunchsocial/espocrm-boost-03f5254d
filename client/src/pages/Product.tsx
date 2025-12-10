import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Phone,
  MessageSquare,
  Calendar,
  Clock,
  Shield,
  Zap,
  Users,
  Check,
  ArrowRight,
} from 'lucide-react';

interface PlanInfo {
  code: string;
  name: string;
  setupFee: number;
  monthlyPrice: number;
  minutesIncluded: number;
  overageRate: number;
  popular?: boolean;
}

const plans: PlanInfo[] = [
  {
    code: 'starter',
    name: 'Starter',
    setupFee: 499,
    monthlyPrice: 149,
    minutesIncluded: 300,
    overageRate: 0.10,
  },
  {
    code: 'growth',
    name: 'Growth',
    setupFee: 799,
    monthlyPrice: 249,
    minutesIncluded: 750,
    overageRate: 0.09,
    popular: true,
  },
  {
    code: 'professional',
    name: 'Professional',
    setupFee: 999,
    monthlyPrice: 399,
    minutesIncluded: 1500,
    overageRate: 0.08,
  },
];

const features = [
  'AI Phone Answering 24/7',
  'Website Chat Widget',
  'Voice AI Widget',
  'Appointment Booking',
  'Lead Capture & CRM',
  'Call Recordings & Transcripts',
];

export default function Product() {
  const navigate = useNavigate();

  const handleGetStarted = (planCode: string) => {
    navigate(`/buy?plan=${planCode}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">E</span>
            </div>
            <span className="text-xl font-semibold">EverLaunch AI</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/biz')}>
              Partner Program
            </Button>
            <Button variant="outline" onClick={() => navigate('/sales')}>
              Watch Demo
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24 text-center">
        <Badge variant="secondary" className="mb-6">
          AI-Powered Customer Engagement
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 max-w-4xl mx-auto">
          24/7 AI Phone & Chat Assistant for Your Business
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Never miss another call or lead. Our AI handles inbound calls, website chat, 
          and appointment booking — even while you sleep.
        </p>

        {/* Trust indicators */}
        <div className="flex flex-wrap justify-center gap-6 mb-12">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 text-primary" />
            <span>Enterprise-grade AI</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="h-4 w-4 text-primary" />
            <span>Setup in minutes</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4 text-primary" />
            <span>Trusted by 500+ businesses</span>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          <Card className="bg-card/50 border-border">
            <CardContent className="pt-6">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Phone className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">AI Phone Answering</h3>
              <p className="text-sm text-muted-foreground">
                Natural conversations that handle inquiries and book appointments.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border">
            <CardContent className="pt-6">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Website Chat & Voice</h3>
              <p className="text-sm text-muted-foreground">
                Engage visitors instantly with AI chat and voice widgets.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border">
            <CardContent className="pt-6">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Appointment Booking</h3>
              <p className="text-sm text-muted-foreground">
                Automatically capture leads and schedule appointments.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border">
            <CardContent className="pt-6">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Always Available</h3>
              <p className="text-sm text-muted-foreground">
                Works around the clock — nights, weekends, holidays.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your business. All plans include full AI capabilities.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card 
              key={plan.code}
              className={`relative ${plan.popular ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                </div>
              )}
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-4xl font-bold text-foreground">${plan.monthlyPrice}</span>
                  <span className="text-muted-foreground">/month</span>
                </CardDescription>
                <p className="text-sm text-muted-foreground mt-2">
                  + ${plan.setupFee} one-time setup fee
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center p-4 rounded-lg bg-secondary/50">
                  <div className="text-2xl font-bold">{plan.minutesIncluded}</div>
                  <div className="text-sm text-muted-foreground">minutes included/month</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    ${plan.overageRate.toFixed(2)}/min overage
                  </div>
                </div>

                <ul className="space-y-3">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  className="w-full" 
                  size="lg"
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => handleGetStarted(plan.code)}
                >
                  Get Started
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border bg-card/50">
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to Never Miss a Lead Again?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join hundreds of businesses using EverLaunch AI to capture more leads 
            and provide 24/7 customer service.
          </p>
          <Button size="lg" onClick={() => handleGetStarted('growth')}>
            Start Your Free Trial
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} EverLaunch AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
