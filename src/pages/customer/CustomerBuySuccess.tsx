import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, Mail, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function CustomerBuySuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isResendingEmail, setIsResendingEmail] = useState(false);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    const processSuccess = async () => {
      if (!sessionId) {
        setError("Missing session information");
        setIsProcessing(false);
        return;
      }

      try {
        // The Stripe webhook should have already processed the payment
        // and created the customer profile. We just need to verify the session
        // and redirect to onboarding.
        
        // Wait a moment for webhook processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if the current user has a customer profile
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          // User might need to log in again after Stripe redirect
          toast.info("Please log in to continue with setup");
          navigate("/auth?redirect=/customer/onboarding/wizard/1");
          return;
        }

        // Check for customer profile
        const { data: profile } = await supabase
          .from("customer_profiles")
          .select("id, onboarding_stage")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile) {
          setIsProcessing(false);
          // Profile exists, proceed to onboarding after a brief success message
        } else {
          // Profile not yet created, might still be processing
          // Show success anyway and let onboarding handle it
          setIsProcessing(false);
        }
      } catch (err) {
        console.error("Error processing success:", err);
        setError("There was an issue processing your payment. Please contact support.");
        setIsProcessing(false);
      }
    };

    processSuccess();
  }, [sessionId, navigate]);

  const handleContinue = () => {
    navigate("/customer/onboarding/wizard/1");
  };

  const handleResendWelcomeEmail = async () => {
    setIsResendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke('resend-welcome-email');
      if (error) throw error;
      toast.success("Welcome email sent! Check your inbox (and spam folder).");
    } catch (err) {
      console.error("Error resending welcome email:", err);
      toast.error("Failed to resend email. Please try again.");
    } finally {
      setIsResendingEmail(false);
    }
  };

  if (isProcessing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
            <CardTitle>Processing Your Order</CardTitle>
            <CardDescription>
              Please wait while we set up your account...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-destructive">Something Went Wrong</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/customer/onboarding/wizard/1")}>Continue to Setup</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to EverLaunch AI!</CardTitle>
          <CardDescription>
            Your payment was successful. Let's set up your AI receptionist.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            The setup process takes about 5 minutes. We'll help you configure your AI to perfectly represent your business.
          </p>
          
          <Button onClick={handleContinue} className="w-full" size="lg">
            Start Setup Now
          </Button>
          
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Mail className="h-4 w-4" />
              <span>A welcome email is on its way!</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Didn't receive it? Check your spam folder or resend:
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResendWelcomeEmail}
              disabled={isResendingEmail}
              className="w-full"
            >
              {isResendingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Resend Welcome Email
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}