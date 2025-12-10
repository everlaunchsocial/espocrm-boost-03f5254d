import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle, Phone, Calendar, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getStoredAffiliateId, storeAffiliateAttribution } from "@/utils/affiliateAttribution";
import { getAffiliateUsernameFromSubdomain } from "@/utils/subdomainRouting";
import { useAffiliateContext } from "@/hooks/useAffiliateContext";

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

export default function DemoRequestPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");

  // Get affiliate from subdomain or stored attribution
  const affiliateUsername = getAffiliateUsernameFromSubdomain();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !businessName) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);

    try {
      // Create a lead record for the demo request
      const { error } = await supabase.from("leads").insert({
        first_name: name.split(" ")[0] || name,
        last_name: name.split(" ").slice(1).join(" ") || "",
        email,
        phone,
        company: businessName,
        industry: businessType || "Other",
        source: "demo_request",
        affiliate_id: resolvedAffiliateId,
        pipeline_status: "new_lead",
        status: "new",
        notes: `Demo request submitted. Business type: ${businessType}`,
      });

      if (error) throw error;

      // Optionally notify the affiliate via edge function
      if (resolvedAffiliateId) {
        // Fire and forget - don't block on notification
        supabase.functions.invoke("request-demo", {
          body: {
            affiliateId: resolvedAffiliateId,
            leadName: name,
            leadEmail: email,
            leadPhone: phone,
            businessName,
            businessType,
          },
        }).catch(console.error);
      }

      setIsSubmitted(true);
      toast.success("Demo request submitted successfully!");
    } catch (error) {
      console.error("Demo request error:", error);
      toast.error("Failed to submit demo request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background py-20">
        <div className="container mx-auto px-4">
          <Card className="mx-auto max-w-md text-center">
            <CardHeader>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Thank You!</CardTitle>
              <CardDescription>
                We've received your demo request. One of our team members will reach out within 24 hours to schedule your personalized demo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-sm text-muted-foreground">
                In the meantime, feel free to explore what our AI receptionist can do for your business.
              </p>
              <Button onClick={() => window.location.href = "/"}>
                Back to Home
              </Button>
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
                  <h3 className="font-semibold text-foreground">Q&A Session</h3>
                  <p className="text-sm text-muted-foreground">
                    Get answers to all your questions from our team
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Form */}
          <Card>
            <CardHeader>
              <CardTitle>Request Your Demo</CardTitle>
              <CardDescription>
                Fill out the form below and we'll be in touch within 24 hours.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                    placeholder="john@business.com"
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
                  <Label htmlFor="businessType">Business Type</Label>
                  <Select value={businessType} onValueChange={setBusinessType}>
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
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Request Demo"
                  )}
                </Button>
                
                <p className="text-center text-xs text-muted-foreground">
                  No credit card required. We'll contact you to schedule your demo.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
