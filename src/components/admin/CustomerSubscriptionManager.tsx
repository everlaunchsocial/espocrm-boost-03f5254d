import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { format } from "date-fns";
import { Gift, CreditCard, AlertTriangle, CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerProfile {
  id: string;
  user_id: string;
  business_name: string | null;
  contact_name: string | null;
  customer_plan_id: string | null;
  subscription_type: string;
  complimentary_reason: string | null;
  complimentary_granted_by: string | null;
  complimentary_granted_at: string | null;
  complimentary_expires_at: string | null;
}

interface CustomerPlan {
  id: string;
  name: string;
  code: string;
  monthly_price: number;
  setup_fee: number;
}

interface CustomerSubscriptionManagerProps {
  customer: CustomerProfile;
  onClose: () => void;
}

export function CustomerSubscriptionManager({ customer, onClose }: CustomerSubscriptionManagerProps) {
  const queryClient = useQueryClient();
  const [showComplimentaryModal, setShowComplimentaryModal] = useState(false);
  const [showConvertToPaidModal, setShowConvertToPaidModal] = useState(false);
  const [complimentaryReason, setComplimentaryReason] = useState("");
  const [durationType, setDurationType] = useState<"indefinite" | "expires">("indefinite");
  const [expiresDate, setExpiresDate] = useState<Date | undefined>(undefined);
  const [selectedPlanId, setSelectedPlanId] = useState(customer.customer_plan_id || "");
  const [waiveSetupFee, setWaiveSetupFee] = useState(true);
  const [billingStart, setBillingStart] = useState<"immediate" | "grace">("grace");
  const [gracePeriodDays, setGracePeriodDays] = useState(30);

  // Fetch plans
  const { data: plans } = useQuery({
    queryKey: ["customer-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_plans")
        .select("*")
        .eq("is_active", true)
        .order("monthly_price", { ascending: true });
      if (error) throw error;
      return data as CustomerPlan[];
    },
  });

  const currentPlan = plans?.find(p => p.id === customer.customer_plan_id);
  const isComplimentary = customer.subscription_type === "complimentary";

  // Grant complimentary access mutation
  const grantComplimentaryMutation = useMutation({
    mutationFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Not authenticated");

      const expiresAtValue = durationType === "expires" && expiresDate 
        ? expiresDate.toISOString() 
        : null;

      const updateData = {
        subscription_type: "complimentary" as const,
        complimentary_reason: complimentaryReason || null,
        complimentary_granted_by: user.id,
        complimentary_granted_at: new Date().toISOString(),
        complimentary_expires_at: expiresAtValue,
      };

      const { error } = await supabase
        .from("customer_profiles")
        .update(updateData)
        .eq("id", customer.id);

      if (error) throw error;

      // Log to audit
      await supabase.from("audit_logs").insert([{
        user_id: user.id,
        action: "subscription_granted_complimentary",
        resource_type: "customer_profiles",
        resource_id: customer.id,
        details: {
          customer_name: customer.business_name || customer.contact_name || "",
          reason: complimentaryReason || "",
          expires_at: expiresAtValue || "",
          previous_type: customer.subscription_type,
        },
      }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
      toast.success("Complimentary access granted successfully");
      setShowComplimentaryModal(false);
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to grant access: ${error.message}`);
    },
  });

  // Convert to paid mutation
  const convertToPaidMutation = useMutation({
    mutationFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("customer_profiles")
        .update({
          subscription_type: "paying",
          customer_plan_id: selectedPlanId,
          complimentary_reason: null,
          complimentary_granted_by: null,
          complimentary_granted_at: null,
          complimentary_expires_at: null,
        })
        .eq("id", customer.id);

      if (error) throw error;

      // Log to audit
      await supabase.from("audit_logs").insert([{
        user_id: user.id,
        action: "subscription_reverted_paid",
        resource_type: "customer_profiles",
        resource_id: customer.id,
        details: {
          customer_name: customer.business_name || customer.contact_name,
          new_plan_id: selectedPlanId,
          waive_setup_fee: waiveSetupFee,
          billing_start: billingStart,
          grace_period_days: billingStart === "grace" ? gracePeriodDays : null,
        },
      }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
      toast.success("Converted to paid subscription");
      setShowConvertToPaidModal(false);
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to convert: ${error.message}`);
    },
  });

  // Change plan mutation
  const changePlanMutation = useMutation({
    mutationFn: async (newPlanId: string) => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("customer_profiles")
        .update({ customer_plan_id: newPlanId })
        .eq("id", customer.id);

      if (error) throw error;

      // Log to audit
      await supabase.from("audit_logs").insert([{
        user_id: user.id,
        action: "subscription_plan_changed",
        resource_type: "customer_profiles",
        resource_id: customer.id,
        details: {
          customer_name: customer.business_name || customer.contact_name,
          old_plan_id: customer.customer_plan_id,
          new_plan_id: newPlanId,
        },
      }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
      toast.success("Plan updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to change plan: ${error.message}`);
    },
  });

  const selectedPlan = plans?.find(p => p.id === selectedPlanId);

  return (
    <>
      <div className="space-y-6 p-4 border rounded-lg bg-card">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Subscription Management</h3>
          <Badge variant="outline" className="text-xs">Super Admin Only</Badge>
        </div>

        {/* Current Status */}
        <div className="grid gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current Plan:</span>
            <span className="font-medium">
              {currentPlan ? `${currentPlan.name} ($${currentPlan.monthly_price}/month)` : "No plan"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status:</span>
            <div className="flex items-center gap-2">
              {isComplimentary ? (
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                  <Gift className="h-3 w-3 mr-1" />
                  Complimentary
                </Badge>
              ) : (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  <CreditCard className="h-3 w-3 mr-1" />
                  Paying
                </Badge>
              )}
            </div>
          </div>
          {isComplimentary && customer.complimentary_reason && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Reason:</span>
              <span className="text-xs italic">{customer.complimentary_reason}</span>
            </div>
          )}
          {isComplimentary && customer.complimentary_expires_at && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Expires:</span>
              <span className="text-amber-400">
                {format(new Date(customer.complimentary_expires_at), "MMM d, yyyy")}
              </span>
            </div>
          )}
        </div>

        {/* Plan Selector */}
        <div className="space-y-2">
          <Label>Change Plan</Label>
          <Select 
            value={customer.customer_plan_id || ""} 
            onValueChange={(value) => changePlanMutation.mutate(value)}
            disabled={changePlanMutation.isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a plan" />
            </SelectTrigger>
            <SelectContent>
              {plans?.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name} - ${plan.monthly_price}/month
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {isComplimentary ? (
            <Button 
              onClick={() => setShowConvertToPaidModal(true)}
              className="flex-1"
              variant="default"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Convert to Paid
            </Button>
          ) : (
            <Button 
              onClick={() => setShowComplimentaryModal(true)}
              className="flex-1"
              variant="outline"
            >
              <Gift className="h-4 w-4 mr-2" />
              Mark as Complimentary
            </Button>
          )}
        </div>
      </div>

      {/* Grant Complimentary Modal */}
      <Dialog open={showComplimentaryModal} onOpenChange={setShowComplimentaryModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Grant Complimentary Subscription</DialogTitle>
            <DialogDescription>
              {customer.business_name || customer.contact_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {currentPlan && (
              <div className="text-sm text-muted-foreground">
                Current Plan: <span className="font-medium text-foreground">{currentPlan.name} (${currentPlan.monthly_price}/month)</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Input
                id="reason"
                placeholder="e.g., Promotional partnership"
                value={complimentaryReason}
                onChange={(e) => setComplimentaryReason(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Duration</Label>
              <RadioGroup value={durationType} onValueChange={(v) => setDurationType(v as "indefinite" | "expires")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="indefinite" id="indefinite" />
                  <Label htmlFor="indefinite" className="font-normal">
                    Indefinite (until manually changed)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="expires" id="expires" />
                  <Label htmlFor="expires" className="font-normal">
                    Expires on:
                  </Label>
                </div>
              </RadioGroup>

              {durationType === "expires" && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !expiresDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expiresDate ? format(expiresDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={expiresDate}
                      onSelect={setExpiresDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>

            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                <div className="text-sm text-amber-200">
                  <p className="font-medium mb-1">This will:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-xs">
                    <li>Cancel Stripe subscription (no refund)</li>
                    <li>Mark account as "Complimentary"</li>
                    <li>Customer keeps full access to features</li>
                    <li>No billing emails sent</li>
                    <li>Can be reverted to paying anytime</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowComplimentaryModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => grantComplimentaryMutation.mutate()}
              disabled={grantComplimentaryMutation.isPending || (durationType === "expires" && !expiresDate)}
            >
              {grantComplimentaryMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm - Grant Free Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Paid Modal */}
      <Dialog open={showConvertToPaidModal} onOpenChange={setShowConvertToPaidModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convert to Paid Subscription</DialogTitle>
            <DialogDescription>
              {customer.business_name || customer.contact_name}
              <Badge className="ml-2 bg-purple-500/20 text-purple-400">Currently Complimentary</Badge>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Plan</Label>
              <RadioGroup value={selectedPlanId} onValueChange={setSelectedPlanId}>
                {plans?.map((plan) => (
                  <div key={plan.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={plan.id} id={plan.id} />
                    <Label htmlFor={plan.id} className="font-normal flex-1 flex justify-between">
                      <span>{plan.name}</span>
                      <span className="text-muted-foreground">${plan.monthly_price}/month</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Setup Fee</Label>
              <RadioGroup value={waiveSetupFee ? "waive" : "charge"} onValueChange={(v) => setWaiveSetupFee(v === "waive")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="charge" id="charge-setup" />
                  <Label htmlFor="charge-setup" className="font-normal">
                    Charge full setup fee {selectedPlan && `($${selectedPlan.setup_fee})`}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="waive" id="waive-setup" />
                  <Label htmlFor="waive-setup" className="font-normal">
                    Waive setup fee
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Billing Start</Label>
              <RadioGroup value={billingStart} onValueChange={(v) => setBillingStart(v as "immediate" | "grace")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="immediate" id="immediate" />
                  <Label htmlFor="immediate" className="font-normal">
                    Immediately
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="grace" id="grace" />
                  <Label htmlFor="grace" className="font-normal flex items-center gap-2">
                    Grace period:
                    <Input
                      type="number"
                      value={gracePeriodDays}
                      onChange={(e) => setGracePeriodDays(parseInt(e.target.value) || 30)}
                      className="w-16 h-7"
                      min={1}
                      max={90}
                    />
                    days
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="rounded-lg bg-muted/50 border p-3 text-sm">
              <p className="font-medium mb-1">Customer will receive:</p>
              <ul className="list-disc list-inside space-y-0.5 text-muted-foreground text-xs">
                <li>Email notification of change</li>
                {billingStart === "immediate" && <li>Stripe payment link</li>}
                {billingStart === "grace" && <li>Billing reminder after grace period</li>}
              </ul>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowConvertToPaidModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => convertToPaidMutation.mutate()}
              disabled={convertToPaidMutation.isPending || !selectedPlanId}
            >
              {convertToPaidMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Convert to Paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
