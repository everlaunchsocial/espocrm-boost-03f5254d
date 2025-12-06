import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Phone, MessageSquare, Clock, Star, ArrowRight, Zap, Shield, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PagePreview } from '@/components/demos/PagePreview';

const Sales = () => {
  const navigate = useNavigate();
  const [demoData, setDemoData] = useState<{ id: string; screenshot: string; businessName: string; aiPersonaName: string } | null>(null);

  useEffect(() => {
    // Fetch the Re-envision Medspa demo
    const fetchDemo = async () => {
      const { data } = await supabase
        .from('demos')
        .select('id, screenshot_url, business_name, ai_persona_name')
        .ilike('business_name', '%reenvision%')
        .limit(1)
        .single();
      
      if (data && data.screenshot_url) {
        setDemoData({
          id: data.id,
          screenshot: data.screenshot_url,
          businessName: data.business_name,
          aiPersonaName: data.ai_persona_name || 'Jenna'
        });
      }
    };
    fetchDemo();
  }, []);

  const features = [
    { icon: Phone, title: '24/7 Phone Coverage', description: 'Never miss a call, even after hours' },
    { icon: MessageSquare, title: 'Intelligent Chat', description: 'Engage website visitors instantly' },
    { icon: Clock, title: 'Instant Response', description: 'No hold times, ever' },
    { icon: Users, title: 'Lead Capture', description: 'Automatically qualify and capture leads' },
  ];

  const benefits = [
    'Custom-trained on YOUR business',
    'Handles appointments & inquiries',
    'Speaks naturally like a real person',
    'Works on phone, web, and text',
    'Books directly into your calendar',
    'Sends follow-up emails automatically',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">EverLaunch AI</span>
          </div>
          <Button onClick={() => navigate('/checkout')} className="shadow-lg">
            Get Started <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-4xl mx-auto mb-12">
          <Badge variant="secondary" className="mb-4 px-4 py-1">
            🚀 AI-Powered Customer Service
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Your Business, <span className="text-primary">Never Closed</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Custom AI voice agents that answer calls, book appointments, and capture leads 24/7. 
            Trained specifically for YOUR business.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/checkout')} className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all">
              Start Today — $997 Setup
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6" onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}>
              See Live Demo
            </Button>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-4 gap-6 mt-16">
          {features.map((feature, i) => (
            <Card key={i} className="p-6 text-center hover:shadow-lg transition-shadow border-border/50 bg-card/50 backdrop-blur">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Live Demo Section */}
      <section id="demo" className="bg-muted/30 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Try It Yourself</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              This is a real AI demo built for a medspa. Click the chat button to experience 
              how your customers would interact with YOUR AI assistant.
            </p>
          </div>
          
          <div className="flex justify-center">
            {demoData ? (
              <div className="transform hover:scale-[1.02] transition-transform duration-300">
                <PagePreview
                  screenshot={demoData.screenshot}
                  demoId={demoData.id}
                  businessName={demoData.businessName}
                  aiPersonaName={demoData.aiPersonaName}
                />
              </div>
            ) : (
              <Card className="w-80 h-[500px] flex items-center justify-center bg-muted/50">
                <p className="text-muted-foreground">Loading demo...</p>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Why Local Businesses Choose EverLaunch AI
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Stop losing leads to voicemail. Our AI agents are trained specifically on your 
              business, services, and pricing — delivering personalized experiences that convert.
            </p>
            <ul className="space-y-4">
              {benefits.map((benefit, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-green-500" />
                  </div>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
          <Card className="p-8 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <div className="flex items-center gap-2 mb-4">
              {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
            </div>
            <blockquote className="text-lg mb-4">
              "We were missing 40% of our calls after hours. Now our AI handles everything — 
              bookings are up 35% and I sleep better at night."
            </blockquote>
            <p className="font-semibold">— Sarah M., Salon Owner</p>
          </Card>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="bg-muted/30 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg text-muted-foreground">No hidden fees. No long-term contracts.</p>
          </div>
          
          <Card className="max-w-lg mx-auto p-8 shadow-xl border-2 border-primary/20 bg-card">
            <div className="text-center">
              <Badge className="mb-4">Most Popular</Badge>
              <h3 className="text-2xl font-bold mb-2">EverLaunch AI Agent</h3>
              <p className="text-muted-foreground mb-6">Complete AI solution for your business</p>
              
              <div className="mb-6">
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-bold">$997</span>
                  <span className="text-muted-foreground">one-time setup</span>
                </div>
                <div className="text-lg text-muted-foreground mt-2">
                  + <span className="font-semibold text-foreground">$279</span>/month thereafter
                </div>
              </div>
              
              <ul className="text-left space-y-3 mb-8">
                {[
                  'Custom AI trained on your business',
                  'Phone, chat & text capabilities',
                  '24/7 availability',
                  'Appointment booking integration',
                  'Lead capture & follow-up',
                  'Dedicated support team',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                size="lg" 
                className="w-full text-lg py-6 shadow-lg hover:shadow-xl transition-all"
                onClick={() => navigate('/checkout')}
              >
                Get Started Now <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              
              <p className="text-sm text-muted-foreground mt-4 flex items-center justify-center gap-2">
                <Shield className="w-4 h-4" />
                30-day money-back guarantee
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto px-4 py-16 md:py-24 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Ready to Never Miss a Lead Again?
        </h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Join hundreds of local businesses already using EverLaunch AI to grow their revenue.
        </p>
        <Button 
          size="lg" 
          className="text-lg px-12 py-6 shadow-lg hover:shadow-xl transition-all"
          onClick={() => navigate('/checkout')}
        >
          Start Your AI Agent Today
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 EverLaunch AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Sales;
