import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Check, Gift, Globe, Share2, ArrowLeft, CreditCard, Lock, Calendar, Zap } from 'lucide-react';
import { 
  SiFacebook, 
  SiInstagram, 
  SiTiktok, 
  SiYoutube, 
  SiPinterest, 
  SiLinkedin, 
  SiThreads
} from 'react-icons/si';
import { FaGoogle } from 'react-icons/fa';
import { toast } from 'sonner';

const Checkout = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    businessName: '',
    cardNumber: '',
    expiry: '',
    cvc: '',
  });

  const socialNetworks = [
    { name: 'Facebook', icon: SiFacebook, color: '#1877F2' },
    { name: 'Instagram', icon: SiInstagram, color: '#E4405F' },
    { name: 'TikTok', icon: SiTiktok, color: '#000000' },
    { name: 'YouTube', icon: SiYoutube, color: '#FF0000' },
    { name: 'Pinterest', icon: SiPinterest, color: '#BD081C' },
    { name: 'LinkedIn', icon: SiLinkedin, color: '#0A66C2' },
    { name: 'Google', icon: FaGoogle, color: '#4285F4' },
    { name: 'Truth Social', icon: Share2, color: '#5448EE' },
    { name: 'Threads', icon: SiThreads, color: '#000000' },
    { name: 'BlueSky', icon: Share2, color: '#0085FF' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Thank you! This is a demo checkout. In production, your order would be processed.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate('/sales')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to offer
          </button>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-green-500" />
            <span className="text-sm text-muted-foreground">Secure Checkout</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          
          {/* Left Column - Free Bonuses */}
          <div className="space-y-6">
            <div>
              <Badge variant="secondary" className="mb-4">
                <Gift className="w-3 h-3 mr-1" /> Exclusive Bonuses Included
              </Badge>
              <h1 className="text-3xl font-bold mb-2">You're Almost There!</h1>
              <p className="text-muted-foreground">
                Complete your order to unlock these FREE bonuses worth over $2,000
              </p>
            </div>

            {/* Bonus 1: Website Mockup */}
            <Card className="p-6 border-2 border-green-500/30 bg-green-500/5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <Globe className="w-6 h-6 text-green-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold">FREE Website Mockup</h3>
                    <Badge variant="outline" className="text-green-500 border-green-500">$997 Value</Badge>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    Since we'll be adding rich AI content to your website, we'd love to create a 
                    <strong className="text-foreground"> complimentary website mockup</strong> showing 
                    how your enhanced site could look. No obligation — it's our gift to you!
                  </p>
                  <ul className="space-y-2">
                    {['Modern, mobile-responsive design', 'AI-optimized content layout', 'Conversion-focused structure'].map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>

            {/* Bonus 2: Social Media Marketing */}
            <Card className="p-6 border-2 border-primary/30 bg-primary/5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Share2 className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold">2 Weeks FREE Social Media Marketing</h3>
                    <Badge variant="outline" className="text-primary border-primary">$1,200 Value</Badge>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    Our background is in social media marketing and management. Let us create 
                    <strong className="text-foreground"> two weeks of professional content</strong> for 
                    your business — completely free!
                  </p>
                  
                  <div className="bg-background/50 rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium mb-3">We post to up to 10 social networks:</p>
                    <div className="grid grid-cols-5 gap-3">
                      {socialNetworks.map((network, i) => (
                        <div 
                          key={i} 
                          className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                          title={network.name}
                        >
                          <network.icon 
                            className="w-6 h-6" 
                            style={{ color: network.color }}
                          />
                          <span className="text-xs text-muted-foreground truncate w-full text-center">
                            {network.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span><strong>You approve all content</strong> — we'll pass it to you for review before posting</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span>Option to give us temporary access, or we send content for you to post</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span>Professional graphics and captions tailored to your brand</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Schedule Call CTA */}
            <Card className="p-6 bg-muted/50 border-dashed">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">We'll Schedule a Planning Call</h3>
                  <p className="text-sm text-muted-foreground">
                    After your order, we'll reach out to schedule a call to plan your free website 
                    mockup and social media content strategy.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - Checkout Form */}
          <div>
            <Card className="p-6 shadow-xl sticky top-8">
              <div className="flex items-center gap-2 mb-6">
                <Zap className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Complete Your Order</h2>
              </div>

              {/* Order Summary */}
              <div className="bg-muted/50 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span>EverLaunch AI Agent Setup</span>
                  <span className="font-semibold">$997</span>
                </div>
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>Monthly subscription (starts in 30 days)</span>
                  <span>$279/mo</span>
                </div>
                <Separator className="my-3" />
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Due Today</span>
                  <span className="text-2xl font-bold">$997</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input 
                      id="firstName" 
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input 
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input 
                    id="phone" 
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input 
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                    required
                  />
                </div>

                <Separator />

                <div>
                  <Label htmlFor="cardNumber" className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Card Number
                  </Label>
                  <Input 
                    id="cardNumber"
                    placeholder="4242 4242 4242 4242"
                    value={formData.cardNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, cardNumber: e.target.value }))}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiry">Expiry Date</Label>
                    <Input 
                      id="expiry"
                      placeholder="MM/YY"
                      value={formData.expiry}
                      onChange={(e) => setFormData(prev => ({ ...prev, expiry: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="cvc">CVC</Label>
                    <Input 
                      id="cvc"
                      placeholder="123"
                      value={formData.cvc}
                      onChange={(e) => setFormData(prev => ({ ...prev, cvc: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full text-lg py-6 shadow-lg">
                  <Lock className="w-4 h-4 mr-2" />
                  Complete Order — $997
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  By completing this order, you agree to our terms of service. 
                  30-day money-back guarantee included.
                </p>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
