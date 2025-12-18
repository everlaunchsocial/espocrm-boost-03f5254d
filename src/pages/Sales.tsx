import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Phone, MessageSquare, Clock, Star, ArrowRight, Zap, Shield, Users, Play, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getPublicDemoUrl } from '@/utils/subdomainRouting';
import { PagePreview } from '@/components/demos/PagePreview';
import { VoiceEmployeeCard } from '@/components/demos/VoiceEmployeeCard';
import { VapiPhoneCard } from '@/components/demos/VapiPhoneCard';

const Sales = () => {
  const navigate = useNavigate();
  const [demoData, setDemoData] = useState<{ id: string; websiteUrl: string; businessName: string; aiPersonaName: string; avatarUrl?: string } | null>(null);
  const [mobileScreenshot, setMobileScreenshot] = useState<string | null>(null);
  const [screenshotLoading, setScreenshotLoading] = useState(true);

  useEffect(() => {
    // Fetch the Re-envision Medspa demo by ID
    const fetchDemo = async () => {
      const { data } = await supabase
        .from('demos')
        .select('id, website_url, business_name, ai_persona_name, avatar_url')
        .eq('id', '4544cc64-4a61-48ec-9f42-71b773ed0c84')
        .single();
      
      if (data && data.website_url) {
        setDemoData({
          id: data.id,
          websiteUrl: data.website_url,
          businessName: data.business_name,
          aiPersonaName: data.ai_persona_name || 'Jenna',
          avatarUrl: data.avatar_url || undefined
        });
        
        // Fetch mobile screenshot via Firecrawl
        fetchMobileScreenshot(data.website_url);
      } else {
        setScreenshotLoading(false);
      }
    };
    fetchDemo();
  }, []);

  const fetchMobileScreenshot = async (websiteUrl: string) => {
    setScreenshotLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('scrape-mobile', {
        body: { url: websiteUrl }
      });

      if (error) {
        console.error('Firecrawl screenshot error:', error);
        setScreenshotLoading(false);
        return;
      }

      if (data?.success && data?.screenshot) {
        setMobileScreenshot(data.screenshot);
      }
    } catch (err) {
      console.error('Error fetching mobile screenshot:', err);
    } finally {
      setScreenshotLoading(false);
    }
  };

  const features = [
    { icon: Phone, title: '24/7 Phone Coverage', description: 'Never miss a call, even at 2am' },
    { icon: MessageSquare, title: 'Intelligent Web Chat', description: 'Engage visitors the second they land' },
    { icon: Clock, title: 'Zero Wait Time', description: 'Instant responses, always' },
    { icon: Users, title: 'Smart Lead Capture', description: 'Qualify & book automatically' },
  ];

  const benefits = [
    'Custom-trained on YOUR business',
    'Handles appointments & inquiries',
    'Speaks naturally like a real person',
    'Works on phone, web, and text',
    'Books directly into your calendar',
    'Sends follow-up emails automatically',
  ];

  const testimonials = [
    {
      quote: "We were missing 40% of our calls after hours. Now our AI handles everything — bookings are up 35% and I sleep better at night.",
      name: "Sarah M.",
      role: "Salon Owner",
      rating: 5
    },
    {
      quote: "Within the first week, the AI booked 12 appointments I would have missed. It paid for itself in 3 days.",
      name: "Mike T.",
      role: "HVAC Contractor",
      rating: 5
    },
    {
      quote: "My customers can't tell it's not a real person. The AI knows our services better than some of my employees!",
      name: "Lisa R.",
      role: "Medspa Owner",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-[hsl(222,47%,8%)] text-white">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-xl bg-[hsl(222,47%,8%)]/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold">EverLaunch AI</span>
          </div>
          <Button onClick={() => navigate('/checkout')} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/30">
            Get Started <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/20 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-500/30 rounded-full blur-[120px] opacity-50" />
        
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="text-center max-w-4xl mx-auto mb-16">
            <Badge className="mb-6 px-4 py-2 bg-blue-500/20 text-blue-300 border-blue-500/30 text-sm">
              🚀 AI-Powered Customer Service for Local Businesses
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
              Your Business,{' '}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Never Closed
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
              Custom AI voice agents that answer calls, book appointments, and capture leads 24/7 — 
              trained specifically on <strong className="text-white">YOUR</strong> business.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => navigate('/checkout')} 
                className="text-lg px-10 py-7 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-xl shadow-blue-500/30 rounded-xl"
              >
                Start Today — $997 Setup
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-10 py-7 border-white/20 bg-white/5 hover:bg-white/10 text-white rounded-xl"
                onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Play className="w-5 h-5 mr-2" /> Try Live Demo
              </Button>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-4 gap-6 mt-8">
            {features.map((feature, i) => (
              <Card key={i} className="p-6 text-center bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/10">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
                  <feature.icon className="w-7 h-7 text-blue-400" />
                </div>
                <h3 className="font-semibold mb-2 text-white">{feature.title}</h3>
                <p className="text-sm text-gray-400">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section className="py-16 md:py-24 relative">
        <div className="container mx-auto px-4">
          <div className="flex justify-center">
            <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl shadow-blue-500/20 border border-white/10 bg-black">
              <div className="aspect-[9/16]">
                <iframe
                  src="https://www.youtube.com/embed/qRwk_1eBhIs"
                  title="EverLaunch AI Demo Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Demo Section */}
      <section id="demo" className="py-20 md:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-600/5 to-transparent" />
        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-16">
            <Badge className="mb-4 px-4 py-2 bg-green-500/20 text-green-300 border-green-500/30">
              ✨ Interactive Demo
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Try Our AI Demo{' '}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Right Now</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              This is a real AI we built for a medspa. Click the chat bubble and have a conversation — 
              this is exactly how YOUR AI would work for your business.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-5 gap-8 items-start">
            {/* Left Column - Demo Info Card (like screenshot reference) */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="shadow-xl border-white/10 bg-white/5 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 px-6 py-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500/30 rounded">
                      <Sparkles className="h-4 w-4 text-blue-400" />
                    </div>
                    <span className="font-semibold text-blue-300">EverLaunch AI</span>
                  </div>
                </div>
                
                <div className="p-6 space-y-5">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Welcome to Your Personal Demo!</h2>
                  </div>

                  <p className="text-gray-300 leading-relaxed">
                    Hi there! We've put together a personalized AI demo just for <span className="font-semibold text-white">{demoData?.businessName || 'ReEnvision Aesthetics and Medspa'}</span>.
                  </p>

                  <div className="space-y-3">
                    <p className="font-medium text-white">Here's how to explore:</p>
                    <div className="space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold shrink-0">1</div>
                        <p className="text-sm text-gray-300">
                          <span className="font-medium text-white">Try the AI Chat</span> — Click the chat bubble on the phone preview to see how AI engages your website visitors
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold shrink-0">2</div>
                        <p className="text-sm text-gray-300">
                          <span className="font-medium text-white">Try Web Voice Chat</span> — Use the voice card to talk directly with the AI assistant through your browser
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold shrink-0">3</div>
                        <p className="text-sm text-gray-300">
                          <span className="font-medium text-white">Try Phone AI</span> — Call the phone number below to experience the AI voice agent on a real phone call
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    <p className="text-sm text-gray-400">
                      This AI is trained specifically for your business. It knows your services, can answer questions, and handles inquiries 24/7.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Voice Employee Card */}
              <VoiceEmployeeCard
                aiPersonaName={demoData?.aiPersonaName || 'Jenna'}
                avatarUrl={demoData?.avatarUrl}
                isConnected={false}
                isConnecting={false}
                isSpeaking={false}
                onStartCall={() => {
                  if (demoData) {
                    window.open(getPublicDemoUrl(demoData.id), '_blank');
                  }
                }}
                onEndCall={() => {}}
              />
            </div>

            {/* Right Column - Phone Preview */}
            <div className="lg:col-span-3 space-y-6">
              <Card className="shadow-xl border-white/10 bg-white/5">
                <div className="border-b border-white/10 bg-white/5 px-6 py-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
                    <MessageSquare className="h-5 w-5 text-blue-400" />
                    Try the AI Chat Demo
                  </h3>
                  <p className="text-sm text-gray-400">
                    Click the chat bubble to start talking to the AI
                  </p>
                </div>
                <div className="p-6">
                  <div className="flex flex-col items-center">
                    {screenshotLoading ? (
                      <div className="flex items-center justify-center py-16">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-3" />
                          <p className="text-sm text-gray-400">Loading website preview...</p>
                        </div>
                      </div>
                    ) : mobileScreenshot && demoData ? (
                      <div className="relative">
                        <div className="absolute -inset-8 bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-blue-500/20 rounded-[60px] blur-2xl" />
                        <div className="relative transform hover:scale-[1.02] transition-transform duration-300">
                          <PagePreview
                            screenshot={mobileScreenshot}
                            demoId={demoData.id}
                            businessName={demoData.businessName}
                            aiPersonaName={demoData.aiPersonaName}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-16 text-gray-400">
                        <p>Unable to load demo preview</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Phone Card */}
              <VapiPhoneCard
                aiPersonaName={demoData?.aiPersonaName || 'Jenna'}
                avatarUrl={demoData?.avatarUrl}
                phoneNumber="+15087799437"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Trusted by Local Business Owners
            </h2>
            <p className="text-xl text-gray-300">Real results from real businesses</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, i) => (
              <Card key={i} className="p-8 bg-white/5 border-white/10 hover:border-blue-500/30 transition-all">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, j) => (
                    <Star key={j} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <blockquote className="text-lg text-gray-300 mb-6 leading-relaxed">
                  "{testimonial.quote}"
                </blockquote>
                <div>
                  <p className="font-semibold text-white">{testimonial.name}</p>
                  <p className="text-sm text-gray-400">{testimonial.role}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 md:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-transparent to-cyan-600/10" />
        <div className="container mx-auto px-4 relative">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <Badge className="mb-4 px-4 py-2 bg-blue-500/20 text-blue-300 border-blue-500/30">
                Why EverLaunch AI?
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                Stop Losing Leads to Voicemail
              </h2>
              <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                Our AI agents are trained specifically on your business, services, and pricing — 
                delivering personalized experiences that <strong className="text-white">convert callers into customers</strong>.
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit, i) => (
                  <li key={i} className="flex items-center gap-4">
                    <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 border border-green-500/30">
                      <Check className="w-4 h-4 text-green-400" />
                    </div>
                    <span className="text-lg text-gray-200">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Stats Card */}
            <div className="grid grid-cols-2 gap-6">
              {[
                { stat: '35%', label: 'More Bookings' },
                { stat: '24/7', label: 'Availability' },
                { stat: '<2s', label: 'Response Time' },
                { stat: '98%', label: 'Accuracy Rate' },
              ].map((item, i) => (
                <Card key={i} className="p-8 bg-white/5 border-white/10 text-center hover:border-blue-500/30 transition-all">
                  <p className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                    {item.stat}
                  </p>
                  <p className="text-gray-400">{item.label}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-300">No hidden fees. No long-term contracts. Cancel anytime.</p>
          </div>
          
          <Card className="max-w-xl mx-auto p-10 bg-gradient-to-b from-white/10 to-white/5 border-2 border-blue-500/30 shadow-2xl shadow-blue-500/10 rounded-2xl">
            <div className="text-center">
              <Badge className="mb-4 bg-blue-500 text-white border-none">Most Popular</Badge>
              <h3 className="text-2xl font-bold mb-2">EverLaunch AI Agent</h3>
              <p className="text-gray-400 mb-8">Complete AI solution for your business</p>
              
              <div className="mb-8">
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-6xl font-bold">$997</span>
                  <span className="text-gray-400">one-time setup</span>
                </div>
                <div className="text-xl text-gray-300 mt-3">
                  + <span className="font-bold text-white">$279</span>/month thereafter
                </div>
              </div>
              
              <ul className="text-left space-y-4 mb-10">
                {[
                  'Custom AI trained on your business',
                  'Phone, chat & text capabilities',
                  '24/7/365 availability',
                  'Appointment booking integration',
                  'Lead capture & follow-up',
                  'Dedicated support team',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-4">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-green-400" />
                    </div>
                    <span className="text-gray-200">{item}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                size="lg" 
                className="w-full text-xl py-7 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-xl shadow-blue-500/30 rounded-xl"
                onClick={() => navigate('/checkout')}
              >
                Get Started Now <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              
              <p className="text-sm text-gray-400 mt-6 flex items-center justify-center gap-2">
                <Shield className="w-4 h-4" />
                30-day money-back guarantee
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-cyan-600/10 to-blue-600/20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-blue-500/30 rounded-full blur-[100px]" />
        
        <div className="container mx-auto px-4 text-center relative">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Never Miss a Lead Again?
          </h2>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Join hundreds of local businesses already using EverLaunch AI to grow their revenue.
          </p>
          <Button 
            size="lg" 
            className="text-xl px-12 py-7 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-xl shadow-blue-500/30 rounded-xl"
            onClick={() => navigate('/checkout')}
          >
            Start Your AI Agent Today
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-10">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p>© 2024 EverLaunch AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Sales;
