import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Loader2, ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getStoredAffiliateId, storeAffiliateAttribution } from "@/utils/affiliateAttribution";
import { getAffiliateUsernameFromPath } from "@/utils/subdomainRouting";
import { useAffiliateContext, loadAffiliateContext } from "@/hooks/useAffiliateContext";

// Plans must match database codes: starter, growth, professional
const plans = [
  {
    id: "starter",
    code: "starter",
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
    code: "growth",
    name: "Growth",
    price: 249,
    setupFee: 799,
    minutes: 750,
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
    code: "professional",
    name: "Professional",
    price: 399,
    setupFee: 999,
    minutes: 1500,
    popular: true,
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

export default function CustomerCheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planFromUrl = searchParams.get("plan");
  
  const [selectedPlan, setSelectedPlan] = useState<string | null>(planFromUrl);
  const [isLoading, setIsLoading] = useState(false);
  
  // Account form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");

  // Get affiliate from URL ref param, subdomain, or stored attribution
  const refFromUrl = searchParams.get("ref");
  const affiliateUsername = getAffiliateUsernameFromPath(window.location.pathname);
  const { affiliate } = useAffiliateContext(affiliateUsername || undefined);
  const [resolvedAffiliateId, setResolvedAffiliateId] = useState<string | null>(null);

  useEffect(() => {
    const resolveAffiliate = async () => {
      // Priority 1: URL ref parameter (from navigation)
      if (refFromUrl) {
        const affiliateContext = await loadAffiliateContext(refFromUrl);
        if (affiliateContext?.id) {
          setResolvedAffiliateId(affiliateContext.id);
          storeAffiliateAttribution(affiliateContext.id);
          console.log("Resolved affiliate from URL ref:", refFromUrl, affiliateContext.id);
          return;
        }
      }
      
      // Priority 2: Path-based affiliate (subdomain/replicated sites)
      if (affiliate?.id) {
        setResolvedAffiliateId(affiliate.id);
        console.log("Resolved affiliate from path:", affiliate.id);
        return;
      }
      
      // Priority 3: Fall back to stored attribution
      const storedId = getStoredAffiliateId();
      if (storedId) {
        setResolvedAffiliateId(storedId);
        console.log("Resolved affiliate from storage:", storedId);
      }
    };
    
    resolveAffiliate();
  }, [refFromUrl, affiliate?.id]);

  // Get the selected plan details
  const currentPlan = plans.find(p => p.id === selectedPlan);

  // Normalize URL to always have https://
  const normalizeUrl = (url: string): string => {
    if (!url) return '';
    let normalized = url.trim();
    // Remove any existing protocol
    normalized = normalized.replace(/^(https?:\/\/)/i, '');
    // Add https:// prefix
    return `https://${normalized}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPlan || !currentPlan) {
      toast.error("Please select a plan");
      return;
    }

    if (!email || !password || !businessName || !contactName) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            business_name: businessName,
            contact_name: contactName,
            phone,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create account");

      // 2. Fetch the customer plan from database by code
      const { data: dbPlan, error: planError } = await supabase
        .from("customer_plans")
        .select("*")
        .eq("code", currentPlan.code)
        .eq("is_active", true)
        .single();

      if (planError || !dbPlan) {
        console.error("Plan lookup error:", planError);
        throw new Error("Selected plan not found in database");
      }

      // 3. Call customer-checkout edge function
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
        "customer-checkout",
        {
          body: {
            planId: dbPlan.id,
            customerId: authData.user.id,
            affiliateId: resolvedAffiliateId,
            customerEmail: email,
            customerName: contactName,
            businessName: businessName,
            websiteUrl: websiteUrl ? normalizeUrl(websiteUrl) : undefined,
            phone: phone,
            successUrl: `${window.location.origin}/customer/buy-success?session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${window.location.origin}/buy?plan=${selectedPlan}`,
          },
        }
      );

      if (checkoutError) throw checkoutError;

      if (checkoutData?.url) {
        window.location.href = checkoutData.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start checkout");
      setIsLoading(false);
    }
  };

  // If no plan selected, show plan selection
  if (!selectedPlan) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h1 className="mb-4 text-3xl font-bold text-foreground">
              Choose Your Plan
            </h1>
            <p className="text-muted-foreground">
              Choose the plan that fits your business needs.
            </p>
          </div>
          
          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
            {plans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`relative cursor-pointer transition-all hover:shadow-lg ${
                  plan.popular ? "border-primary shadow-lg" : "border-border/50"
                }`}
                onClick={() => setSelectedPlan(plan.id)}
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
                  >
                    Select {plan.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Plan is selected - show account form with plan summary at top
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-md">
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => setSelectedPlan(null)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Change Plan
          </Button>
          
          {/* Selected Plan Summary */}
          <Card className="mb-6 border-primary">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{currentPlan?.name} Plan</CardTitle>
                <div className="text-right">
                  <span className="text-2xl font-bold text-foreground">${currentPlan?.price}</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
              </div>
              <CardDescription>
                {currentPlan?.minutes} minutes/month + ${currentPlan?.setupFee} setup fee
              </CardDescription>
            </CardHeader>
          </Card>
          
          {/* Account Creation Form */}
          <Card>
            <CardHeader>
              <CardTitle>Create Your Account</CardTitle>
              <CardDescription>
                Fill in your details to continue to payment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Your Business Name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Business Website</Label>
                  <Input
                    id="websiteUrl"
                    type="text"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="yourbusiness.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contactName">Your Name *</Label>
                  <Input
                    id="contactName"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="John Smith"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@business.com"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a secure password"
                    required
                    minLength={6}
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Continue to Payment"
                  )}
                </Button>
                
                <p className="text-center text-xs text-muted-foreground">
                  By continuing, you agree to our Terms of Service and Privacy Policy.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}