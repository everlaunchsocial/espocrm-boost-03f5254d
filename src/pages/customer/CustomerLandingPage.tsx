import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Calendar, Users, Clock, MessageSquare, Shield, Check, Zap, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getAffiliateUsernameFromPath } from "@/utils/subdomainRouting";
import { useAffiliateContext } from "@/hooks/useAffiliateContext";
import { storeAffiliateAttribution } from "@/utils/affiliateAttribution";
import { useEffect } from "react";

// Plans must match database: starter, growth, professional
const plans = [
  {
    id: "starter",
    name: "Starter",
    price: 149,
    setupFee: 499,
    minutes: 300,
    features: [
      "300 minutes/month",
      "AI Voice Receptionist",
      "Lead Capture",
      "Email Notifications",
      "Business Hours Routing",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: 249,
    setupFee: 799,
    minutes: 750,
    popular: true,
    features: [
      "750 minutes/month",
      "Everything in Starter",
      "Appointment Booking",
      "SMS Notifications",
      "Priority Support",
      "Custom Greeting",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    price: 399,
    setupFee: 999,
    minutes: 1500,
    features: [
      "1500 minutes/month",
      "Everything in Growth",
      "Multiple Locations",
      "Advanced Analytics",
      "Dedicated Account Manager",
      "Custom Integrations",
    ],
  },
];

const features = [
  {
    icon: Phone,
    title: "24/7 AI Receptionist",
    description: "Never miss a call again. Your AI handles calls around the clock, even on holidays.",
  },
  {
    icon: Calendar,
    title: "Instant Appointment Booking",
    description: "AI books appointments directly into your calendar while on the call.",
  },
  {
    icon: Users,
    title: "Lead Capture & Qualification",
    description: "Capture caller information and qualify leads before they reach you.",
  },
  {
    icon: Clock,
    title: "Save 20+ Hours Weekly",
    description: "Stop playing phone tag. Focus on what you do best while AI handles the rest.",
  },
  {
    icon: MessageSquare,
    title: "Natural Conversations",
    description: "Advanced AI that sounds human and understands context like a real receptionist.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-level encryption and compliance for your peace of mind.",
  },
];

export default function CustomerLandingPage() {
  const navigate = useNavigate();
  const affiliateUsername = getAffiliateUsernameFromPath(window.location.pathname);
  const { affiliate } = useAffiliateContext(affiliateUsername || undefined);

  // Set page title
  useEffect(() => {
    document.title = "EverLaunch AI - Never Miss Another Call";
  }, []);

  // Store affiliate attribution when page loads
  useEffect(() => {
    if (affiliate?.id) {
      storeAffiliateAttribution(affiliate.id);
    }
  }, [affiliate?.id]);

  // Navigate directly to checkout with selected plan
  const handlePlanSelect = (planId: string) => {
    navigate(`/buy?plan=${planId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="container relative mx-auto px-4 py-20 lg:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Zap className="h-4 w-4" />
              AI-Powered Business Phone System
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Never Miss Another Call
            </h1>
            <p className="mb-8 text-xl text-muted-foreground">
              Your AI receptionist answers every call, books appointments, and captures leads 24/7. 
              Stop losing business to missed calls and voicemail.
            </p>
            {affiliateUsername && (
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/20 px-4 py-2">
                <UserCheck className="h-4 w-4 text-primary" />
                <span className="text-sm text-foreground">
                  Referred by <strong className="text-primary capitalize">{affiliateUsername}</strong>
                </span>
              </div>
            )}
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" onClick={() => handlePlanSelect("growth")} className="px-8">
                Get Started Now
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/demo-request")}>
                Try Demo First
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground">
              Everything You Need to Handle Calls Like a Pro
            </h2>
            <p className="text-muted-foreground">
              Powered by advanced AI that understands your business and represents you professionally.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="border-border/50 bg-card/50">
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground">
              Choose the plan that fits your call volume. No hidden fees, cancel anytime.
            </p>
          </div>
          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
            {plans.map((plan) => (
              <Card 
                key={plan.name} 
                className={`relative ${plan.popular ? "border-primary shadow-lg" : "border-border/50"}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-foreground">${plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <CardDescription className="mt-2">
                    {plan.minutes} minutes included
                  </CardDescription>
                  <p className="mt-1 text-xs text-muted-foreground">
                    + ${plan.setupFee} one-time setup
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="mb-6 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full" 
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => handlePlanSelect(plan.id)}
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-muted/30 py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground">
            Ready to Stop Missing Calls?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-muted-foreground">
            Join thousands of businesses that never miss a customer call. 
            Set up takes less than 10 minutes.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" onClick={() => handlePlanSelect("growth")} className="px-8">
              Start Your Free Trial
            </Button>
            <Button size="lg" variant="ghost" onClick={() => navigate("/demo-request")}>
              Request a Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} EverLaunch AI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}