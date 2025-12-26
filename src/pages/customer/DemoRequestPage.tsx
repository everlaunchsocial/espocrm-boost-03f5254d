import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Phone, Calendar, Users, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getStoredAffiliateId, storeAffiliateAttribution } from "@/utils/affiliateAttribution";
import { getAffiliateUsernameFromPath } from "@/utils/subdomainRouting";
import { useAffiliateContext } from "@/hooks/useAffiliateContext";
import { z } from "zod";
import { normalizeUrl, isValidUrl } from "@/utils/normalizeUrl";

const businessTypes = [
  "Home Services (Plumber, HVAC, Electrician)",
  "Medical / Dental Practice",
  "Legal Services",
  "Real Estate",
  "Auto Services",
  "Restaurant / Hospitality",
  "Salon / Spa",
  "Fitness / Gym",
  "Financial Services",
  "Other",
];

const formSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  email: z.string().email("Please enter a valid email").max(255),
  phone: z.string().min(7, "Please enter a valid phone number").max(20),
  businessName: z.string().min(1, "Business name is required").max(100),
  businessType: z.string().optional(),
  websiteUrl: z.string().min(1, "Website URL is required"),
});

type FormData = z.infer<typeof formSchema>;

export default function DemoRequestPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingDemo, setIsCreatingDemo] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [demoUrl, setDemoUrl] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    businessName: "",
    businessType: "",
    websiteUrl: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitError, setSubmitError] = useState("");

  // Get affiliate from subdomain or stored attribution
  const affiliateUsername = getAffiliateUsernameFromPath(window.location.pathname);
  const { affiliate } = useAffiliateContext(affiliateUsername || undefined);
  const [resolvedAffiliateId, setResolvedAffiliateId] = useState<string | null>(null);

  useEffect(() => {
    // Store affiliate attribution if from subdomain
    if (affiliate?.id) {
      storeAffiliateAttribution(affiliate.id);
      setResolvedAffiliateId(affiliate.id);
    } else {
      const storedId = getStoredAffiliateId();
      if (storedId) {
        setResolvedAffiliateId(storedId);
      }
    }
  }, [affiliate?.id]);

  // Countdown effect
  useEffect(() => {
    if (isCreatingDemo && demoUrl && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isCreatingDemo && countdown === 0 && demoUrl) {
      // Extract demo ID from URL and navigate
      const demoId = demoUrl.split("/demo/")[1];
      if (demoId) {
        navigate(`/demo/${demoId}`);
      }
    }
  }, [isCreatingDemo, countdown, demoUrl, navigate]);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    setSubmitError("");
  };

  const handleWebsiteBlur = () => {
    if (formData.websiteUrl) {
      const normalized = normalizeUrl(formData.websiteUrl);
      if (normalized !== formData.websiteUrl) {
        setFormData((prev) => ({ ...prev, websiteUrl: normalized }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    // Normalize website URL before validation
    const normalizedWebsiteUrl = normalizeUrl(formData.websiteUrl);
    
    // Validate URL
    if (!isValidUrl(normalizedWebsiteUrl)) {
      setErrors({ websiteUrl: "Please enter a valid website (e.g., yourbusiness.com)" });
      return;
    }

    // Validate form with normalized URL
    const result = formSchema.safeParse({ ...formData, websiteUrl: normalizedWebsiteUrl });
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof FormData, string>> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof FormData;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("request-demo", {
        body: {
          affiliateId: resolvedAffiliateId || null,
          affiliateUsername: affiliateUsername || null,
          businessName: formData.businessName,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          websiteUrl: formData.websiteUrl,
          businessType: formData.businessType || undefined,
        },
      });

      if (error) {
        console.error("Request demo error:", error);
        setSubmitError("Something went wrong. Please try again.");
        return;
      }

      if (!data?.success) {
        setSubmitError(data?.error || "Something went wrong. Please try again.");
        return;
      }

      // Success - start countdown and redirect
      setDemoUrl(data.demoUrl);
      setIsCreatingDemo(true);
      toast.success("Your personalized demo is ready!");
    } catch (err) {
      console.error("Unexpected error:", err);
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Countdown/Creating Demo Screen
  if (isCreatingDemo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center py-12">
        <div className="container mx-auto px-4">
          <Card className="mx-auto max-w-md text-center border-primary/20">
            <CardContent className="pt-12 pb-12">
              <div className="relative mx-auto mb-8 h-24 w-24">
                {/* Animated ring */}
                <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                <div 
                  className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"
                  style={{ animationDuration: "1s" }}
                ></div>
                {/* Countdown number */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold text-primary">{countdown}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-2 mb-4">
                <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                <h2 className="text-2xl font-bold text-foreground">Creating Your Personalized Demo</h2>
                <Sparkles className="h-6 w-6 text-primary animate-pulse" />
              </div>
              
              <p className="text-muted-foreground mb-6">
                We're building an AI experience customized for your business...
              </p>
              
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>✓ Analyzing your website</p>
                <p>✓ Configuring AI voice assistant</p>
                <p>✓ Setting up chat widget</p>
              </div>

              <p className="mt-8 text-xs text-muted-foreground">
                Check your email for a link to your demo!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2">
          {/* Left side - Benefits */}
          <div className="flex flex-col justify-center">
            <h1 className="mb-4 text-3xl font-bold text-foreground lg:text-4xl">
              See How AI Can Transform Your Business
            </h1>
            <p className="mb-8 text-lg text-muted-foreground">
              Get a personalized demo showing exactly how our AI receptionist would work for your specific business.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Live Demo Call</h3>
                  <p className="text-sm text-muted-foreground">
                    Experience a real call with AI trained on your business type
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Custom Configuration</h3>
                  <p className="text-sm text-muted-foreground">
                    See how we'd set up appointment booking for your calendar
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Instant Demo Access</h3>
                  <p className="text-sm text-muted-foreground">
                    Your personalized AI demo will be ready in seconds
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Form */}
          <Card className="border-primary/20">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-xl">Get Your Personalized Demo</CardTitle>
              <CardDescription>
                Enter your details and we'll create your custom AI demo instantly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => handleChange("businessName", e.target.value)}
                    placeholder="Acme Services"
                    className={errors.businessName ? "border-destructive" : ""}
                  />
                  {errors.businessName && (
                    <p className="text-sm text-destructive">{errors.businessName}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleChange("firstName", e.target.value)}
                      placeholder="John"
                      className={errors.firstName ? "border-destructive" : ""}
                    />
                    {errors.firstName && (
                      <p className="text-sm text-destructive">{errors.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleChange("lastName", e.target.value)}
                      placeholder="Smith"
                      className={errors.lastName ? "border-destructive" : ""}
                    />
                    {errors.lastName && (
                      <p className="text-sm text-destructive">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="john@acmeservices.com"
                    className={errors.email ? "border-destructive" : ""}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Mobile Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="(555) 123-4567"
                    className={errors.phone ? "border-destructive" : ""}
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Website URL *</Label>
                  <Input
                    id="websiteUrl"
                    type="text"
                    value={formData.websiteUrl}
                    onChange={(e) => handleChange("websiteUrl", e.target.value)}
                    onBlur={handleWebsiteBlur}
                    placeholder="yourbusiness.com"
                    className={errors.websiteUrl ? "border-destructive" : ""}
                  />
                  {errors.websiteUrl && (
                    <p className="text-sm text-destructive">{errors.websiteUrl}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    We'll use your website to personalize your AI demo
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="businessType">Business Type</Label>
                  <Select 
                    value={formData.businessType} 
                    onValueChange={(value) => handleChange("businessType", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {businessTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {submitError && (
                  <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive">{submitError}</p>
                  </div>
                )}
                
                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Your Demo...
                    </>
                  ) : (
                    "Get My Personalized Demo"
                  )}
                </Button>
                
                <p className="text-center text-xs text-muted-foreground">
                  You'll receive a link to your personalized voice + chat demo by email
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
