import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowRight, Zap, DollarSign, Users, TrendingUp, Gift, Rocket, Star, Play } from 'lucide-react';

const BusinessOpportunity = () => {
  const navigate = useNavigate();

  const commissionTiers = [
    { sales: '1-5', commission: '30%', earnings: '$299/sale' },
    { sales: '6-15', commission: '40%', earnings: '$399/sale' },
    { sales: '16+', commission: '50%', earnings: '$499/sale' },
  ];

  const benefits = [
    'No inventory or fulfillment — we handle everything',
    'Recurring commissions on monthly subscriptions',
    'Done-for-you marketing materials',
    'Personal affiliate dashboard',
    'Weekly payouts via direct deposit',
    'White-label options available',
  ];

  const whoIsThisFor = [
    { icon: Users, title: 'Business Owners', description: 'Refer other business owners and get YOUR system free' },
    { icon: TrendingUp, title: 'Sales Professionals', description: 'Add a high-ticket, high-commission product to your portfolio' },
    { icon: Rocket, title: 'Entrepreneurs', description: 'Build a recurring income stream with a product that sells itself' },
    { icon: Gift, title: 'Networkers', description: 'Share a solution your network actually needs and earns you 50%' },
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
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/sales')} className="text-gray-300 hover:text-white">
              See the Product
            </Button>
            <Button onClick={() => navigate('/checkout')} className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/30">
              Become a Partner <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-green-600/20 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-green-500/30 rounded-full blur-[120px] opacity-50" />
        
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-6 px-4 py-2 bg-green-500/20 text-green-300 border-green-500/30 text-sm">
              💰 Partner Opportunity — Earn Up to 50% Commission
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
              Get Your AI System{' '}
              <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                For Free
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
              Share EverLaunch AI with other business owners. Earn up to <strong className="text-green-400">50% commissions</strong> on every sale — 
              and pay off your own system while building recurring income.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => navigate('/checkout')} 
                className="text-lg px-10 py-7 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-xl shadow-green-500/30 rounded-xl"
              >
                <DollarSign className="w-5 h-5 mr-2" /> Start Earning Today
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-10 py-7 border-white/20 bg-white/5 hover:bg-white/10 text-white rounded-xl"
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Learn How It Works
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Video Section - Placeholder */}
      <section className="py-16 md:py-24 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Watch How Partners Are{' '}
              <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">Winning</span>
            </h2>
            <p className="text-gray-400">See the opportunity in action</p>
          </div>
          <div className="flex justify-center">
            <div className="w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl shadow-green-500/20 border border-white/10 bg-black/50">
              <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-green-900/30 to-emerald-900/30">
                {/* Video placeholder - replace with actual video embed */}
                <div className="text-center p-8">
                  <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                    <Play className="w-10 h-10 text-green-400" />
                  </div>
                  <p className="text-xl font-semibold text-white mb-2">Partner Opportunity Video</p>
                  <p className="text-gray-400">Coming Soon</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Commission Tiers */}
      <section id="how-it-works" className="py-20 md:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-600/5 to-transparent" />
        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-16">
            <Badge className="mb-4 px-4 py-2 bg-green-500/20 text-green-300 border-green-500/30">
              💵 Commission Structure
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Earn Up to{' '}
              <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">50% on Every Sale</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              The more you sell, the higher your commission rate. Plus, earn recurring commissions on monthly subscriptions.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {commissionTiers.map((tier, i) => (
              <Card 
                key={i} 
                className={`p-8 text-center border-white/10 backdrop-blur-sm transition-all ${
                  i === 2 
                    ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30 shadow-xl shadow-green-500/20 scale-105' 
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                {i === 2 && (
                  <Badge className="mb-4 bg-green-500 text-white border-0">
                    <Star className="w-3 h-3 mr-1" /> Top Tier
                  </Badge>
                )}
                <p className="text-sm text-gray-400 mb-2">{tier.sales} Sales</p>
                <p className="text-5xl font-bold text-green-400 mb-2">{tier.commission}</p>
                <p className="text-gray-300">Commission</p>
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-2xl font-semibold text-white">{tier.earnings}</p>
                  <p className="text-sm text-gray-400">per setup fee</p>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Card className="inline-block p-6 bg-green-500/10 border-green-500/30">
              <p className="text-lg text-white">
                <strong className="text-green-400">PLUS:</strong> Earn 50% on all recurring monthly fees ($139.50/month per customer)
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Who Is This For */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Who Is This Opportunity For?
            </h2>
            <p className="text-xl text-gray-300">Perfect for anyone who knows business owners</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {whoIsThisFor.map((item, i) => (
              <Card key={i} className="p-6 bg-white/5 border-white/10 hover:border-green-500/30 transition-all hover:shadow-lg hover:shadow-green-500/10">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-600/20 flex items-center justify-center mb-4 border border-green-500/30">
                  <item.icon className="w-7 h-7 text-green-400" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-white">{item.title}</h3>
                <p className="text-sm text-gray-400">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 md:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 via-transparent to-emerald-600/10" />
        <div className="container mx-auto px-4 relative">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <Badge className="mb-4 px-4 py-2 bg-green-500/20 text-green-300 border-green-500/30">
                Why Partner With Us?
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                We Do the Heavy Lifting
              </h2>
              <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                You bring the referrals, we handle everything else — setup, support, fulfillment, and ongoing service. 
                You just collect your commissions.
              </p>
              
              <ul className="space-y-4">
                {benefits.map((benefit, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 text-green-400" />
                    </div>
                    <span className="text-gray-300">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <Card className="p-8 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
                <h3 className="text-2xl font-bold mb-6 text-center">The Math Is Simple</h3>
                <div className="space-y-4 text-lg">
                  <div className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="text-gray-300">EverLaunch AI Setup</span>
                    <span className="font-semibold text-white">$997</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="text-gray-300">Your Commission (50%)</span>
                    <span className="font-semibold text-green-400">$499</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="text-gray-300">Monthly Fee</span>
                    <span className="font-semibold text-white">$279/mo</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="text-gray-300">Your Monthly Cut (50%)</span>
                    <span className="font-semibold text-green-400">$139.50/mo</span>
                  </div>
                  <div className="pt-4">
                    <p className="text-center text-gray-400 text-sm mb-2">Just 2 sales at top tier =</p>
                    <p className="text-center text-3xl font-bold text-green-400">Your System Paid Off</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <Card className="p-12 md:p-16 bg-gradient-to-br from-green-500/20 to-emerald-600/20 border-green-500/30 text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Start Earning?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join the EverLaunch AI partner program today. Get your own AI system and start earning 
              commissions on every business you refer.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => navigate('/checkout')} 
                className="text-lg px-10 py-7 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-xl shadow-green-500/30 rounded-xl"
              >
                Become a Partner Now <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => navigate('/sales')} 
                className="text-lg px-10 py-7 border-white/20 bg-white/5 hover:bg-white/10 text-white rounded-xl"
              >
                See the Product First
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} EverLaunch AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default BusinessOpportunity;
