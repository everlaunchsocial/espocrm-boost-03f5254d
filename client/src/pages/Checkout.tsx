import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Check, Gift, Globe, Share2, ArrowLeft, CreditCard, Lock, Calendar, Zap } from 'lucide-react';
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
    { name: 'Facebook', color: '#1877F2' },
    { name: 'Instagram', color: '#E4405F' },
    { name: 'TikTok', color: '#00F2EA' },
    { name: 'YouTube', color: '#FF0000' },
    { name: 'Pinterest', color: '#BD081C' },
    { name: 'LinkedIn', color: '#0A66C2' },
    { name: 'Google', color: '#4285F4' },
    { name: 'Truth Social', color: '#5448EE' },
    { name: 'Threads', color: '#FFFFFF' },
    { name: 'BlueSky', color: '#0085FF' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Thank you! This is a demo checkout. In production, your order would be processed.');
  };

  return (
    <div className="min-h-screen bg-[hsl(222,47%,8%)] text-white">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-xl bg-[hsl(222,47%,8%)]/80">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate('/sales')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to offer
          </button>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-green-400" />
            <span className="text-sm text-gray-400">Secure Checkout</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          
          {/* Left Column - Free Bonuses */}
          <div className="space-y-8">
            <div>
              <Badge className="mb-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white border-none px-4 py-2">
                <Gift className="w-4 h-4 mr-2" /> Exclusive Bonuses Included FREE
              </Badge>
              <h1 className="text-4xl font-bold mb-3">You're Almost There!</h1>
              <p className="text-gray-400 text-lg">
                Complete your order to unlock these FREE bonuses worth over <span className="text-green-400 font-semibold">$2,000</span>
              </p>
            </div>

            {/* Bonus 1: Website Mockup */}
            <Card className="p-8 border-2 border-green-500/30 bg-green-500/5 rounded-2xl">
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-500/30">
                  <Globe className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-2xl font-bold">FREE Website Mockup</h3>
                    <Badge variant="outline" className="text-green-400 border-green-500/50 bg-green-500/10">$997 Value</Badge>
                  </div>
                  <p className="text-gray-300 mb-5 leading-relaxed">
                    Since we'll be adding rich AI content to your website, we'd love to create a 
                    <strong className="text-white"> complimentary website mockup</strong> showing 
                    how your enhanced site could look. No obligation — it's our gift to you!
                  </p>
                  <ul className="space-y-3">
                    {['Modern, mobile-responsive design', 'AI-optimized content layout', 'Conversion-focused structure'].map((item, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                          <Check className="w-3 h-3 text-green-400" />
                        </div>
                        <span className="text-gray-200">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>

            {/* Bonus 2: Social Media Marketing */}
            <Card className="p-8 border-2 border-blue-500/30 bg-blue-500/5 rounded-2xl">
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30">
                  <Share2 className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-2xl font-bold">2 Weeks FREE Social Media</h3>
                    <Badge variant="outline" className="text-blue-400 border-blue-500/50 bg-blue-500/10">$1,200 Value</Badge>
                  </div>
                  <p className="text-gray-300 mb-5 leading-relaxed">
                    Our background is in social media marketing and management. Let us create 
                    <strong className="text-white"> two weeks of professional content</strong> for 
                    your business — completely free!
                  </p>
                  
                  <div className="bg-white/5 rounded-xl p-5 mb-5 border border-white/10">
                    <p className="text-sm font-semibold mb-4 text-gray-300">We post to up to 10 social networks:</p>
                    <div className="flex flex-wrap gap-2">
                      {socialNetworks.map((network, i) => (
                        <Badge 
                          key={i} 
                          variant="outline"
                          className="px-3 py-1.5 border-white/20 bg-white/5 text-gray-200"
                        >
                          <span 
                            className="w-2 h-2 rounded-full mr-2" 
                            style={{ backgroundColor: network.color }}
                          />
                          {network.name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30 mt-0.5">
                        <Check className="w-3 h-3 text-blue-400" />
                      </div>
                      <span className="text-gray-200"><strong className="text-white">You approve all content</strong> — we'll pass it to you for review before posting</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30 mt-0.5">
                        <Check className="w-3 h-3 text-blue-400" />
                      </div>
                      <span className="text-gray-200">Option to give us temporary access, or we send content for you to post</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30 mt-0.5">
                        <Check className="w-3 h-3 text-blue-400" />
                      </div>
                      <span className="text-gray-200">Professional graphics and captions tailored to your brand</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Schedule Call CTA */}
            <Card className="p-6 bg-white/5 border border-dashed border-white/20 rounded-xl">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-purple-500/30">
                  <Calendar className="w-7 h-7 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">We'll Schedule a Planning Call</h3>
                  <p className="text-gray-400">
                    After your order, we'll reach out to schedule a call to plan your free website 
                    mockup and social media content strategy.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - Checkout Form */}
          <div>
            <Card className="p-8 bg-white/5 border-white/10 shadow-2xl rounded-2xl sticky top-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold">Complete Your Order</h2>
              </div>

              {/* Order Summary */}
              <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl p-6 mb-8 border border-blue-500/20">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-300">EverLaunch AI Agent Setup</span>
                  <span className="font-semibold text-lg">$997</span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-400">
                  <span>Monthly subscription (starts in 30 days)</span>
                  <span>$279/mo</span>
                </div>
                <Separator className="my-4 bg-white/10" />
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-lg">Due Today</span>
                  <span className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">$997</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className="text-gray-300">First Name</Label>
                    <Input 
                      id="firstName" 
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      required
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-gray-300">Last Name</Label>
                    <Input 
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      required
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email" className="text-gray-300">Email</Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-gray-300">Phone</Label>
                  <Input 
                    id="phone" 
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <Label htmlFor="businessName" className="text-gray-300">Business Name</Label>
                  <Input 
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                  />
                </div>

                <Separator className="bg-white/10" />

                <div>
                  <Label htmlFor="cardNumber" className="flex items-center gap-2 text-gray-300">
                    <CreditCard className="w-4 h-4" />
                    Card Number
                  </Label>
                  <Input 
                    id="cardNumber"
                    placeholder="4242 4242 4242 4242"
                    value={formData.cardNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, cardNumber: e.target.value }))}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiry" className="text-gray-300">Expiry Date</Label>
                    <Input 
                      id="expiry"
                      placeholder="MM/YY"
                      value={formData.expiry}
                      onChange={(e) => setFormData(prev => ({ ...prev, expiry: e.target.value }))}
                      required
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cvc" className="text-gray-300">CVC</Label>
                    <Input 
                      id="cvc"
                      placeholder="123"
                      value={formData.cvc}
                      onChange={(e) => setFormData(prev => ({ ...prev, cvc: e.target.value }))}
                      required
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full text-lg py-7 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-xl shadow-blue-500/30 rounded-xl mt-6"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Complete Order — $997
                </Button>

                <p className="text-xs text-center text-gray-500 pt-2">
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
