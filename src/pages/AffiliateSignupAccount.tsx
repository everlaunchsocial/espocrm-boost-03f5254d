import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Loader2, User, Mail, Lock, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SelectedPlan {
  code: string;
  name: string;
  price: number;
  id: string;
}

const AffiliateSignupAccount = () => {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | null>(null);
  const [referrer, setReferrer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
  });

  useEffect(() => {
    // Read plan and referrer from localStorage
    const storedPlan = localStorage.getItem("selectedAffiliatePlan");
    const storedReferrer = localStorage.getItem("affiliateReferrer");

    if (!storedPlan) {
      toast.error("No plan selected. Please select a plan first.");
      navigate("/affiliate-signup");
      return;
    }

    try {
      setSelectedPlan(JSON.parse(storedPlan));
    } catch {
      navigate("/affiliate-signup");
    }

    if (storedReferrer) {
      setReferrer(storedReferrer);
    }
  }, [navigate]);

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setIsCheckingUsername(true);
    try {
      const { data, error } = await supabase
        .from("affiliates")
        .select("username")
        .eq("username", username.toLowerCase())
        .maybeSingle();

      if (error) throw error;
      setUsernameAvailable(!data);
    } catch (error) {
      console.error("Username check error:", error);
      setUsernameAvailable(null);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    // Only allow alphanumeric and hyphens
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setFormData({ ...formData, username: sanitized });
    
    // Debounce the username check
    const timeoutId = setTimeout(() => {
      checkUsernameAvailability(sanitized);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPlan) {
      toast.error("No plan selected");
      return;
    }

    if (!usernameAvailable) {
      toast.error("Please choose an available username");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/affiliate`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("Failed to create user account");
      }

      const userId = authData.user.id;

      // Step 2: Look up sponsor affiliate ID if referrer exists
      let sponsorAffiliateId: string | null = null;
      if (referrer) {
        const { data: sponsorData } = await supabase
          .from("affiliates")
          .select("id")
          .eq("username", referrer.toLowerCase())
          .maybeSingle();
        
        if (sponsorData) {
          sponsorAffiliateId = sponsorData.id;
        }
      }

      // Step 3: Handle FREE vs PAID plans differently
      if (selectedPlan.price === 0) {
        // FREE PLAN: Create affiliate record directly
        
        // Wait a moment for the auth trigger to create the profile
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Update profile to affiliate role
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ global_role: "affiliate" })
          .eq("user_id", userId);

        if (profileError) {
          console.error("Profile update error:", profileError);
        }

        // Create affiliate record
        const { data: affiliateData, error: affiliateError } = await supabase
          .from("affiliates")
          .insert({
            user_id: userId,
            username: formData.username.toLowerCase(),
            affiliate_plan_id: selectedPlan.id,
            parent_affiliate_id: sponsorAffiliateId,
            demo_credits_balance: 5, // Free tier gets 5 credits
            demo_credits_reset_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (affiliateError) throw affiliateError;

        // Populate genealogy
        if (affiliateData) {
          await supabase.rpc("populate_genealogy_for_affiliate", {
            p_affiliate_id: affiliateData.id,
          });
        }

        // Clear localStorage
        localStorage.removeItem("selectedAffiliatePlan");
        localStorage.removeItem("affiliateReferrer");

        toast.success("Account created successfully!");
        navigate("/affiliate");
      } else {
        // PAID PLAN: Redirect to Stripe checkout
        
        // Store user data for post-checkout processing
        localStorage.setItem("pendingAffiliateUserId", userId);
        localStorage.setItem("pendingAffiliateUsername", formData.username.toLowerCase());

        // Call affiliate-checkout edge function
        const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
          "affiliate-checkout",
          {
            body: {
              plan_code: selectedPlan.code,
              user_id: userId,
              email: formData.email,
              username: formData.username.toLowerCase(),
              sponsor_affiliate_id: sponsorAffiliateId,
            },
          }
        );

        if (checkoutError) throw checkoutError;

        if (checkoutData?.error) {
          // Handle Stripe not configured error gracefully
          if (checkoutData.stripe_not_configured) {
            toast.error("Paid plans are not available yet. Please choose the Free plan.");
            return;
          }
          throw new Error(checkoutData.error);
        }

        if (checkoutData?.url) {
          // Redirect to Stripe checkout
          window.location.href = checkoutData.url;
        } else {
          throw new Error("No checkout URL returned");
        }
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      
      // Handle specific errors
      if (error.message?.includes("already registered")) {
        toast.error("This email is already registered. Please log in instead.");
      } else {
        toast.error(error.message || "Failed to create account");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedPlan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-md mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/affiliate-signup")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Plans
        </Button>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Create Your Account</CardTitle>
            <CardDescription>
              You selected the <span className="font-semibold text-primary">{selectedPlan.name}</span> plan
              {selectedPlan.price > 0 && (
                <span className="block mt-1">
                  ${selectedPlan.price}/month
                </span>
              )}
            </CardDescription>
            {referrer && (
              <p className="text-sm text-muted-foreground mt-2">
                Referred by: <span className="font-medium">{referrer}</span>
              </p>
            )}
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    placeholder="your-username"
                    value={formData.username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    className="pl-10"
                    required
                    minLength={3}
                  />
                </div>
                {isCheckingUsername && (
                  <p className="text-sm text-muted-foreground">Checking availability...</p>
                )}
                {usernameAvailable === true && formData.username.length >= 3 && (
                  <p className="text-sm text-green-600">✓ Username available</p>
                )}
                {usernameAvailable === false && (
                  <p className="text-sm text-destructive">✗ Username taken</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Your referral link will be: tryeverlaunch.com/{formData.username || "username"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !usernameAvailable}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : selectedPlan.price > 0 ? (
                  "Continue to Payment"
                ) : (
                  "Create Account"
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => navigate("/auth")}
                >
                  Log in
                </Button>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AffiliateSignupAccount;
