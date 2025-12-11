import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { storeAffiliateAttribution } from '@/utils/affiliateAttribution';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { 
  Phone, MessageSquare, Calendar, Clock, Users, BarChart3, 
  CheckCircle, Star, Shield, Zap, ChevronRight, Play
} from 'lucide-react';
import { verticalConfig, type VerticalKey } from '@/lib/verticalConfig';
import everlaunchLogo from '@/assets/everlaunch-logo.png';

export default function VerticalLandingPage() {
  const { username, vertical } = useParams<{ username: string; vertical: string }>();
  const [affiliateId, setAffiliateId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    businessName: '',
    phone: '',
    email: '',
    bestTime: 'morning',
  });

  const config = verticalConfig[vertical as VerticalKey];

  useEffect(() => {
    async function loadAffiliate() {
      if (!username) return;
      
      const { data } = await supabase.rpc('get_affiliate_id_by_username', {
        p_username: username.toLowerCase()
      });
      
      if (data) {
        setAffiliateId(data);
        storeAffiliateAttribution(data);
      }
    }
    loadAffiliate();
  }, [username]);

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
          <p className="text-muted-foreground">This industry page doesn't exist.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke('create-lead-and-notify', {
        body: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          company: formData.businessName,
          source: `vertical_${vertical}`,
          affiliateId,
          notes: `Best time to call: ${formData.bestTime}. Vertical: ${config.name}`,
        }
      });

      if (error) throw error;
      
      toast.success('Demo request submitted! We\'ll be in touch soon.');
      setFormData({
        firstName: '',
        lastName: '',
        businessName: '',
        phone: '',
        email: '',
        bestTime: 'morning',
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToDemo = () => {
    document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToForm = () => {
    document.getElementById('cta-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section 
        className="relative min-h-screen flex items-center justify-center"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.7)), url('${config.heroImage}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Logo */}
        <div className="absolute top-6 left-6 z-10">
          <img src={everlaunchLogo} alt="EverLaunch.ai" className="h-10 md:h-12" />
        </div>

        {/* Nav Buttons */}
        <div className="absolute top-6 right-6 z-10 flex gap-3">
          <Button variant="ghost" className="text-white hover:bg-white/20" onClick={scrollToDemo}>
            See Demo
          </Button>
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={scrollToForm}>
            Get Started
          </Button>
        </div>

        <div className="container max-w-4xl text-center text-white px-6 py-20">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            {config.headline}
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-white/90">
            {config.subheadline}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-lg px-8 py-6"
              onClick={scrollToDemo}
            >
              <Play className="mr-2 h-5 w-5" />
              See Live Demo
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white text-white hover:bg-white/20 text-lg px-8 py-6"
              onClick={scrollToForm}
            >
              Request Custom Demo
            </Button>
          </div>
          <p className="mt-6 text-sm text-white/70">
            No credit card required • 5-minute setup
          </p>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="py-20 bg-muted/30">
        <div className="container max-w-6xl px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Sound Familiar?
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            {config.industry} professionals face these challenges every day
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {config.painPoints.map((pain, idx) => (
              <Card key={idx} className="bg-background border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="text-3xl mb-4">{pain.icon}</div>
                  <h3 className="font-semibold mb-2">{pain.title}</h3>
                  <p className="text-sm text-muted-foreground">{pain.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 bg-background">
        <div className="container max-w-6xl px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Introducing EverLaunch AI for {config.industry}
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                {config.solutionSubheadline}
              </p>
              <ul className="space-y-4">
                {config.features.slice(0, 6).map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button 
                size="lg" 
                className="mt-8 bg-emerald-500 hover:bg-emerald-600"
                onClick={scrollToDemo}
              >
                See How It Works
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="relative">
              <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <div className="text-center p-8">
                  <Phone className="h-16 w-16 mx-auto mb-4 text-primary" />
                  <p className="text-lg font-medium">AI-Powered Phone System</p>
                  <p className="text-sm text-muted-foreground mt-2">Available 24/7</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted/30">
        <div className="container max-w-6xl px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: Zap, title: 'Quick Setup (15 Min)', desc: 'Tell us about your business, choose your AI\'s voice and personality' },
              { step: '02', icon: Users, title: 'AI Learns Your Business', desc: 'Upload your website/documents, we configure industry-specific responses' },
              { step: '03', icon: Phone, title: 'Start Capturing Leads', desc: 'Get your dedicated number, embed chat on your website, monitor in real-time' },
            ].map((item, idx) => (
              <Card key={idx} className="bg-background border-0 shadow-lg text-center">
                <CardContent className="p-8">
                  <div className="text-5xl font-bold text-primary/20 mb-4">{item.step}</div>
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Live Demo Section */}
      <section id="demo-section" className="py-20 bg-gradient-to-br from-primary to-primary/80">
        <div className="container max-w-6xl px-6 text-white">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Try It Now - Call Our {config.industry} Demo
          </h2>
          <p className="text-center text-white/80 mb-12 max-w-2xl mx-auto">
            See how EverLaunch AI handles real {config.industry.toLowerCase()} inquiries
          </p>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="bg-white/10 border-white/20">
              <CardContent className="p-8 text-center">
                <Phone className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Call Our Demo Line</h3>
                <p className="text-2xl font-bold mb-4">(555) 123-4567</p>
                <p className="text-sm text-white/70">
                  Try asking about {config.demoPrompts[0]}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white/10 border-white/20">
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Try the Chat</h3>
                <p className="text-white/80 mb-4">Experience our AI chat assistant</p>
                <Button variant="secondary" className="bg-white text-primary hover:bg-white/90">
                  Start Chat Demo
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {config.demoPrompts.map((prompt, idx) => (
              <Card key={idx} className="bg-white/10 border-white/20">
                <CardContent className="p-4 text-center text-sm">
                  {prompt}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-background">
        <div className="container max-w-6xl px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Everything You Need
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Clock, title: '24/7 Availability', desc: 'Never miss after-hours opportunities' },
              { icon: Users, title: 'Instant Lead Capture', desc: 'Collects name, phone, email automatically' },
              { icon: Calendar, title: 'Appointment Booking', desc: 'Books directly to your calendar' },
              { icon: Phone, title: 'Smart Call Routing', desc: 'Transfers emergencies to you' },
              { icon: MessageSquare, title: 'Multi-Channel', desc: 'Phone, web chat, SMS' },
              { icon: BarChart3, title: 'Analytics & Insights', desc: 'Track all calls and conversions' },
            ].map((feature, idx) => (
              <Card key={idx} className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-muted/30">
        <div className="container max-w-3xl px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-center text-muted-foreground mb-12">
            No long-term contracts. Cancel anytime.
          </p>
          
          <Card className="border-2 border-primary shadow-xl">
            <CardContent className="p-8 text-center">
              <p className="text-lg text-muted-foreground mb-2">Starting at</p>
              <p className="text-5xl font-bold mb-2">$149<span className="text-xl font-normal text-muted-foreground">/month</span></p>
              <p className="text-sm text-muted-foreground mb-6">+ $499 one-time setup fee</p>
              
              <ul className="text-left space-y-3 mb-8 max-w-sm mx-auto">
                {['300 minutes of AI calls', 'Unlimited web chat', 'Dedicated phone number', 'Lead capture & routing', 'Calendar integration', '24/7 support'].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              
              <Button size="lg" className="w-full bg-emerald-500 hover:bg-emerald-600" onClick={scrollToForm}>
                Get Started
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-20 bg-background">
        <div className="container max-w-4xl px-6">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-0">
            <CardContent className="p-8 md:p-12 text-center">
              <div className="flex justify-center gap-1 mb-4">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <blockquote className="text-xl md:text-2xl italic mb-6">
                "{config.testimonial.quote}"
              </blockquote>
              <p className="font-semibold">{config.testimonial.name}</p>
              <p className="text-sm text-muted-foreground">{config.testimonial.business}</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-muted/30">
        <div className="container max-w-3xl px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Frequently Asked Questions
          </h2>
          <Accordion type="single" collapsible className="space-y-4">
            {config.faqs.map((faq, idx) => (
              <AccordionItem key={idx} value={`faq-${idx}`} className="bg-background rounded-lg border-0 shadow">
                <AccordionTrigger className="px-6 hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section id="cta-section" className="py-20 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="container max-w-4xl px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-4">
            Ready to Never Miss Another {config.leadTerm} Again?
          </h2>
          <p className="text-center text-white/80 mb-12 max-w-2xl mx-auto">
            See EverLaunch AI customized for YOUR {config.industry.toLowerCase()} business
          </p>

          <Card className="max-w-xl mx-auto">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input 
                      id="firstName" 
                      value={formData.firstName}
                      onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input 
                      id="lastName"
                      value={formData.lastName}
                      onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input 
                    id="businessName"
                    value={formData.businessName}
                    onChange={e => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="bestTime">Best Time to Call</Label>
                  <Select value={formData.bestTime} onValueChange={v => setFormData(prev => ({ ...prev, bestTime: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Morning (9am - 12pm)</SelectItem>
                      <SelectItem value="afternoon">Afternoon (12pm - 5pm)</SelectItem>
                      <SelectItem value="evening">Evening (5pm - 8pm)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full bg-emerald-500 hover:bg-emerald-600"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Request My Custom Demo'}
                </Button>
              </form>
              
              <div className="flex justify-center gap-6 mt-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Shield className="h-4 w-4" /> Secure</span>
                <span className="flex items-center gap-1"><Phone className="h-4 w-4" /> Call within 24h</span>
                <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4" /> No credit card</span>
              </div>
            </CardContent>
          </Card>

          {vertical === 'network-marketing' && (
            <p className="text-center text-white/60 mt-8 text-sm">
              💡 Also interested in earning commissions? Ask about our affiliate program.
            </p>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-slate-900 border-t border-white/10">
        <div className="container max-w-6xl px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <img src={everlaunchLogo} alt="EverLaunch.ai" className="h-8" />
            <p className="text-sm text-white/60">
              © {new Date().getFullYear()} EverLaunch.ai. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
