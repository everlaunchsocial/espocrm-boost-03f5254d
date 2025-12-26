import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, Clock, Mail, User, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useState } from "react";

interface IncompleteCustomer {
  id: string;
  business_name: string | null;
  contact_name: string | null;
  lead_email: string | null;
  affiliate_id: string | null;
  affiliate_username: string | null;
  payment_received_at: string | null;
  onboarding_stage: string | null;
  hours_since_payment: number;
}

function getPriorityBadge(hours: number) {
  if (hours >= 48) {
    return (
      <Badge variant="destructive" className="gap-1">
        <span>🔴</span> Urgent
      </Badge>
    );
  }
  if (hours >= 24) {
    return (
      <Badge
        variant="secondary"
        className="gap-1 bg-yellow-500/20 text-yellow-700"
      >
        <span>⚠️</span> Warning
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1">
      <span>🆕</span> New
    </Badge>
  );
}

export function IncompleteSetupsWidget() {
  const queryClient = useQueryClient();
  const [sendingId, setSendingId] = useState<string | null>(null);

  const { data: customers, isLoading } = useQuery({
    queryKey: ["incomplete-onboarding-customers"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_incomplete_onboarding_customers",
        { p_limit: 10 }
      );
      if (error) throw error;
      return (data ?? []) as IncompleteCustomer[];
    },
  });

  const handleSendReminder = async (customerId: string) => {
    try {
      setSendingId(customerId);
      const { data, error } = await supabase.functions.invoke(
        "send-onboarding-reminder",
        {
          body: { customer_id: customerId },
        }
      );

      if (error) {
        throw new Error(error.message || "Failed to send reminder");
      }

      if (!data?.success) {
        throw new Error(data?.error || "Failed to send reminder");
      }

      toast.success("Reminder sent");
      queryClient.invalidateQueries({
        queryKey: ["incomplete-onboarding-customers"],
      });
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to send onboarding reminder"
      );
    } finally {
      setSendingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-yellow-500/50">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!customers || customers.length === 0) {
    return null; // Don't show widget if no incomplete setups
  }

  return (
    <Card className="border-yellow-500/50 bg-yellow-50/30 dark:bg-yellow-900/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          Incomplete Customer Setups ({customers.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {customers.map((customer) => (
          <div
            key={customer.id}
            className="flex items-start justify-between rounded-lg border bg-card p-3"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {getPriorityBadge(customer.hours_since_payment)}
                <span className="font-medium">
                  {customer.business_name || "Unnamed Business"}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Paid{" "}
                  {customer.payment_received_at
                    ? formatDistanceToNow(new Date(customer.payment_received_at), {
                        addSuffix: true,
                      })
                    : "recently"}
                </span>
                {customer.affiliate_username && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />@{customer.affiliate_username}
                  </span>
                )}
              </div>
              {customer.lead_email && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  {customer.lead_email}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={sendingId === customer.id}
                onClick={() => handleSendReminder(customer.id)}
                className="gap-2"
              >
                {sendingId === customer.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reminder"
                )}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
