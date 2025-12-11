import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Calendar, Users, Clock, MessageSquare, Shield, Check, Zap, ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getAffiliateUsernameFromPath } from "@/utils/subdomainRouting";
import { useAffiliateContext } from "@/hooks/useAffiliateContext";
import { storeAffiliateAttribution } from "@/utils/affiliateAttribution";
import { useEffect } from "react";
import everlaunchLogoWhite from "@/assets/everlaunch-logo-white.png";

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
    <div className="min-h-screen bg-[#0A0F1C]">
      {/* Header */}
      <header className="relative z-50 border-b border-white/10 bg-[#0A0F1C]/80 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <img src={everlaunchLogoWhite} alt="EverLaunch AI" className="h-10" />
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              className="text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => navigate("/demo-request")}
            >
              Try Demo
            </Button>
            <Button 
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0"
              onClick={() => handlePlanSelect("growth")}
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-[#0A0F1C] to-cyan-600/10" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/30 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[128px]" />
        
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        />
        
        <div className="container relative mx-auto px-4 py-24 lg:py-36">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 px-4 py-2 text-sm font-medium text-blue-300 animate-fade-in">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              AI-Powered Business Phone System
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-7xl animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Never Miss Another{' '}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Call
              </span>
            </h1>
            <p className="mb-10 text-xl text-white/60 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
              Your AI receptionist answers every call, books appointments, and captures leads 24/7. 
              Stop losing business to missed calls and voicemail.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <Button 
                size="lg" 
                onClick={() => handlePlanSelect("growth")} 
                className="px-8 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0 shadow-lg shadow-blue-500/25 text-lg h-14"
              >
                Get Started Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                onClick={() => navigate("/demo-request")}
                className="bg-white text-slate-900 hover:bg-white/90 text-lg h-14 font-semibold"
              >
                Try Demo First
              </Button>
            </div>
            
            {/* Trust badges */}
            <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-white/40 animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                <span className="text-sm">Bank-Level Security</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                <span className="text-sm">Setup in 10 Minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5" />
                <span className="text-sm">No Long-Term Contracts</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-24 border-t border-white/10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0F1C] via-[#0D1321] to-[#0A0F1C]" />
        <div className="container relative mx-auto px-4">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
              Everything You Need to Handle{' '}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Calls Like a Pro
              </span>
            </h2>
            <p className="text-white/50 text-lg">
              Powered by advanced AI that understands your business and represents you professionally.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card 
                key={feature.title} 
                className="group relative border-white/10 bg-[#111827] backdrop-blur-sm hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
                <CardHeader className="relative">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 group-hover:border-blue-500/50 transition-colors">
                    <feature.icon className="h-7 w-7 text-cyan-400" />
                  </div>
                  <CardTitle className="text-lg text-white">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <CardDescription className="text-white/50 text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative py-24 border-t border-white/10">
        <div className="absolute inset-0 bg-[#0A0F1C]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[200px]" />
        
        <div className="container relative mx-auto px-4">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
              Simple, Transparent{' '}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Pricing
              </span>
            </h2>
            <p className="text-white/50 text-lg">
              Choose the plan that fits your call volume. No hidden fees, cancel anytime.
            </p>
          </div>
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <Card 
                key={plan.name} 
                className={`relative border-white/10 bg-[#111827] backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] ${
                  plan.popular 
                    ? "border-blue-500/50 shadow-xl shadow-blue-500/20" 
                    : "hover:border-white/20"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-1.5 text-xs font-semibold text-white shadow-lg">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardHeader className="text-center pt-8">
                  <CardTitle className="text-xl text-white">{plan.name}</CardTitle>
                  <div className="mt-6">
                    <span className="text-5xl font-bold text-white">${plan.price}</span>
                    <span className="text-white/50">/month</span>
                  </div>
                  <CardDescription className="mt-3 text-white/60">
                    {plan.minutes} minutes included
                  </CardDescription>
                  <p className="mt-2 text-sm text-white/40">
                    + ${plan.setupFee} one-time setup
                  </p>
                </CardHeader>
                <CardContent className="pt-6">
                  <ul className="mb-8 space-y-4">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20">
                          <Check className="h-3 w-3 text-cyan-400" />
                        </div>
                        <span className="text-sm text-white/70">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full h-12 text-base font-semibold ${
                      plan.popular 
                        ? "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0 shadow-lg shadow-blue-500/25" 
                        : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                    }`}
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
      <section className="relative py-24 border-t border-white/10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-[#0A0F1C] to-cyan-600/10" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-500/15 rounded-full blur-[150px]" />
        
        <div className="container relative mx-auto px-4 text-center">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-6 text-3xl font-bold text-white sm:text-5xl">
              Ready to Stop{' '}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Missing Calls?
              </span>
            </h2>
            <p className="mx-auto mb-10 max-w-2xl text-white/50 text-lg">
              Join thousands of businesses that never miss a customer call. 
              Set up takes less than 10 minutes.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button 
                size="lg" 
                onClick={() => handlePlanSelect("growth")} 
                className="px-10 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0 shadow-lg shadow-blue-500/25 text-lg h-14"
              >
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="ghost" 
                onClick={() => navigate("/demo-request")}
                className="text-white/70 hover:text-white hover:bg-white/10 text-lg h-14"
              >
                Request a Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/10 py-10 bg-[#070A12]">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <img src={everlaunchLogoWhite} alt="EverLaunch AI" className="h-8 opacity-70" />
            <p className="text-sm text-white/40">
              © {new Date().getFullYear()} EverLaunch AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
