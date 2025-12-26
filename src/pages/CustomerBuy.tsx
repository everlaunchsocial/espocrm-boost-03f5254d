import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerSignup, CustomerPlan, CustomerSignupData } from '@/hooks/useCustomerSignup';
import { getStoredAffiliateId } from '@/utils/affiliateAttribution';
import { normalizeUrl } from '@/utils/normalizeUrl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Building2,
  User,
  Mail,
  Phone,
  Globe,
  Loader2,
} from 'lucide-react';

type Step = 'plan' | 'info' | 'confirm';

export default function CustomerBuy() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const { fetchPlans, lookupAffiliate, createCustomerProfile, isLoading } = useCustomerSignup();

  // State
  const [currentStep, setCurrentStep] = useState<Step>('plan');
  const [plans, setPlans] = useState<CustomerPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<CustomerPlan | null>(null);
  const [affiliateId, setAffiliateId] = useState<string | null>(null);
  const [affiliateUsername, setAffiliateUsername] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [formData, setFormData] = useState<CustomerSignupData>({
    businessName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    website: '',
  });

  // Load plans and check for pre-selected plan
  useEffect(() => {
    const loadPlans = async () => {
      const loadedPlans = await fetchPlans();
      setPlans(loadedPlans);

      // Check for pre-selected plan in query params
      const planCode = searchParams.get('plan');
      if (planCode) {
        const plan = loadedPlans.find((p) => p.code === planCode);
        if (plan) {
          setSelectedPlan(plan);
          setCurrentStep('info');
        }
      }
    };

    loadPlans();
  }, [searchParams]);

  // Check for affiliate context
  useEffect(() => {
    const checkAffiliate = async () => {
      // First check URL param
      const refParam = searchParams.get('ref');
      if (refParam) {
        const affId = await lookupAffiliate(refParam);
        if (affId) {
          setAffiliateId(affId);
          setAffiliateUsername(refParam);
          return;
        }
      }

      // Then check stored attribution
      const storedId = getStoredAffiliateId();
      if (storedId) {
        setAffiliateId(storedId);
      }
    };

    checkAffiliate();
  }, [searchParams]);

  // Check auth status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser({ id: authUser.id, email: authUser.email || '' });
        setFormData((prev) => ({ ...prev, email: authUser.email || '' }));
      }
      setIsAuthChecking(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || '' });
        setFormData((prev) => ({ ...prev, email: session.user.email || '' }));
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handlePlanSelect = (plan: CustomerPlan) => {
    setSelectedPlan(plan);
    setCurrentStep('info');
  };

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.businessName || !formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Normalize website URL before proceeding
    if (formData.website) {
      const normalized = normalizeUrl(formData.website);
      setFormData((prev) => ({ ...prev, website: normalized }));
    }

    setCurrentStep('confirm');
  };

  const handleWebsiteBlur = () => {
    if (formData.website) {
      const normalized = normalizeUrl(formData.website);
      if (normalized !== formData.website) {
        setFormData((prev) => ({ ...prev, website: normalized }));
      }
    }
  };

  const handleConfirm = async () => {
    if (!selectedPlan) {
      toast.error('No plan selected');
      return;
    }

    if (!user) {
      // Redirect to auth with return URL
      toast.info('Please sign in to continue');
      return;
    }

    // First create the customer profile
    const result = await createCustomerProfile(
      user.id,
      selectedPlan.id,
      affiliateId,
      formData
    );

    if (!result.success) {
      toast.error(result.error || 'Failed to complete signup');
      return;
    }

    // Now create Stripe checkout session
    try {
      const response = await supabase.functions.invoke('customer-checkout', {
        body: {
          planId: selectedPlan.id,
          customerId: result.customerId,
          affiliateId: affiliateId,
          customerEmail: formData.email,
          customerName: `${formData.firstName} ${formData.lastName}`,
          successUrl: `${window.location.origin}/buy/success?plan=${selectedPlan.code}&customerId=${result.customerId}`,
          cancelUrl: `${window.location.origin}/buy?plan=${selectedPlan.code}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create checkout session');
      }

      const { url } = response.data;
      
      if (url) {
        // Redirect to Stripe Checkout
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to initiate payment. Please try again.');
    }
  };

  const features = [
    'AI Phone Answering 24/7',
    'Website Chat Widget',
    'Voice AI Widget',
    'Appointment Booking',
    'Lead Capture & CRM',
    'Call Recordings & Transcripts',
  ];

  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
          {affiliateUsername && (
            <div className="text-sm text-muted-foreground">
              Rep: <span className="font-medium text-foreground">{affiliateUsername}</span>
            </div>
          )}
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-12">
          {(['plan', 'info', 'confirm'] as Step[]).map((step, index) => (
            <div key={step} className="flex items-center">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center font-medium ${
                  currentStep === step
                    ? 'bg-primary text-primary-foreground'
                    : index < ['plan', 'info', 'confirm'].indexOf(currentStep)
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {index + 1}
              </div>
              {index < 2 && (
                <div className={`w-20 h-0.5 mx-2 ${
                  index < ['plan', 'info', 'confirm'].indexOf(currentStep) ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Plan Selection */}
        {currentStep === 'plan' && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Choose Your Plan</h1>
              <p className="text-muted-foreground">
                Choose the plan that fits your business needs.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <Card
                  key={plan.code}
                  className={`cursor-pointer transition-all hover:border-primary/50 ${
                    plan.code === 'growth' ? 'border-primary ring-2 ring-primary/20' : ''
                  }`}
                  onClick={() => handlePlanSelect(plan)}
                >
                  {plan.code === 'growth' && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-4 pt-8">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription>
                      <span className="text-3xl font-bold text-foreground">${plan.monthlyPrice}</span>
                      <span className="text-muted-foreground">/mo</span>
                    </CardDescription>
                    <p className="text-xs text-muted-foreground mt-1">
                      + ${plan.setupFee} setup
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center p-3 rounded-lg bg-secondary/50">
                      <div className="text-xl font-bold">{plan.minutesIncluded}</div>
                      <div className="text-xs text-muted-foreground">minutes/month</div>
                    </div>
                    <Button className="w-full">
                      Select Plan
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Business Info */}
        {currentStep === 'info' && selectedPlan && (
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <Button
                variant="ghost"
                className="mb-4"
                onClick={() => setCurrentStep('plan')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to plans
              </Button>
              
              <h1 className="text-3xl font-bold mb-2">Tell Us About Your Business</h1>
              <p className="text-muted-foreground mb-8">
                We'll use this to customize your AI assistant.
              </p>

              <form onSubmit={handleInfoSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="businessName" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Business Name *
                  </Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="Acme Plumbing Co."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      First Name *
                    </Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="John"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Smith"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Business Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@acmeplumbing.com"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Mobile Phone *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="website" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Website (optional)
                  </Label>
                  <Input
                    id="website"
                    type="text"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    onBlur={handleWebsiteBlur}
                    placeholder="yourbusiness.com"
                  />
                </div>

                <Button type="submit" className="w-full" size="lg">
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </form>
            </div>

            {/* Plan Summary Sidebar */}
            <div>
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b">
                    <div>
                      <div className="font-semibold">{selectedPlan.name} Plan</div>
                      <div className="text-sm text-muted-foreground">Monthly subscription</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">${selectedPlan.monthlyPrice}/mo</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pb-4 border-b">
                    <div>
                      <div className="font-medium">One-time Setup Fee</div>
                    </div>
                    <div className="font-semibold">${selectedPlan.setupFee}</div>
                  </div>

                  <div className="space-y-2">
                    <div className="font-medium">Includes:</div>
                    <ul className="space-y-1">
                      {features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="h-3 w-3 text-primary flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Due Today:</span>
                      <span>${selectedPlan.setupFee}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Then ${selectedPlan.monthlyPrice}/month starting next billing cycle
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {currentStep === 'confirm' && selectedPlan && (
          <div className="max-w-2xl mx-auto">
            <Button
              variant="ghost"
              className="mb-4"
              onClick={() => setCurrentStep('info')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Confirm Your Order</CardTitle>
                <CardDescription>
                  Review your information before completing your signup.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Business Info Summary */}
                <div className="p-4 rounded-lg bg-secondary/50">
                  <h3 className="font-semibold mb-3">Business Information</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Business:</div>
                    <div>{formData.businessName}</div>
                    <div className="text-muted-foreground">Contact:</div>
                    <div>{formData.firstName} {formData.lastName}</div>
                    <div className="text-muted-foreground">Email:</div>
                    <div>{formData.email}</div>
                    <div className="text-muted-foreground">Phone:</div>
                    <div>{formData.phone}</div>
                    {formData.website && (
                      <>
                        <div className="text-muted-foreground">Website:</div>
                        <div>{formData.website}</div>
                      </>
                    )}
                  </div>
                </div>

                {/* Plan Summary */}
                <div className="p-4 rounded-lg bg-secondary/50">
                  <h3 className="font-semibold mb-3">Plan Details</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>{selectedPlan.name} Plan</span>
                      <span className="font-medium">${selectedPlan.monthlyPrice}/mo</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Setup Fee (one-time)</span>
                      <span className="font-medium">${selectedPlan.setupFee}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Minutes Included</span>
                      <span>{selectedPlan.minutesIncluded}/month</span>
                    </div>
                  </div>
                </div>

                {affiliateUsername && (
                  <div className="text-center text-sm text-muted-foreground">
                    Referred by: <span className="font-medium text-foreground">{affiliateUsername}</span>
                  </div>
                )}

                {!user && (
                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-sm text-amber-600 dark:text-amber-400 text-center">
                      You'll need to create an account to complete your purchase.
                    </p>
                  </div>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleConfirm}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Complete Signup
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  By completing this signup, you agree to our Terms of Service and Privacy Policy.
                  Billing will be activated once your account is verified.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
