import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { 
  Search, Users, AlertCircle, CheckCircle2, Clock, 
  Mail, Phone, MoreHorizontal, Eye, HelpCircle, History, FileDown, Activity
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentAffiliate } from "@/hooks/useCurrentAffiliate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AffiliateCustomerDetailDialog, AffiliateCustomerData, getUsageStatus } from "@/components/affiliate/AffiliateCustomerDetailDialog";

interface AffiliateCustomer {
  id: string;
  business_name: string | null;
  contact_name: string | null;
  onboarding_stage: string | null;
  customer_source: string | null;
  created_at: string;
  payment_received_at: string | null;
  lead_email: string | null;
  phone: string | null;
  website_url: string | null;
  plan_name: string | null;
  last_active_at: Date | null;
}

type CustomerPriority = 'urgent' | 'warning' | 'new' | 'complete' | 'pending';

function getCustomerPriority(customer: AffiliateCustomer): CustomerPriority {
  const stage = customer.onboarding_stage?.toLowerCase() || '';
  const isComplete = stage.includes("complete") || stage.includes("done");
  
  if (isComplete) return 'complete';
  
  if (!customer.payment_received_at) return 'pending';
  
  const paymentDate = new Date(customer.payment_received_at);
  const hoursAgo = (Date.now() - paymentDate.getTime()) / (1000 * 60 * 60);
  
  if (hoursAgo >= 48) return 'urgent';
  if (hoursAgo >= 24) return 'warning';
  return 'new';
}

function getPriorityIcon(priority: CustomerPriority) {
  switch (priority) {
    case 'urgent':
      return <span className="text-destructive text-lg" title="Urgent - 48+ hours without setup">🔴</span>;
    case 'warning':
      return <span className="text-amber-500 text-lg" title="Warning - 24-48 hours without setup">⚠️</span>;
    case 'new':
      return <span className="text-blue-500 text-lg" title="New - less than 24 hours">🆕</span>;
    case 'complete':
      return <span className="text-emerald-500 text-lg" title="Setup complete">✅</span>;
    case 'pending':
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

function getStatusBadge(customer: AffiliateCustomer) {
  const priority = getCustomerPriority(customer);
  
  switch (priority) {
    case 'urgent':
    case 'warning':
    case 'new':
      return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">Setup Incomplete</Badge>;
    case 'complete':
      return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">Active</Badge>;
    case 'pending':
      return <Badge variant="outline">Pending Payment</Badge>;
  }
}

function transformToDialogData(customer: AffiliateCustomer): AffiliateCustomerData {
  return {
    id: customer.id,
    businessName: customer.business_name,
    contactName: customer.contact_name,
    email: customer.lead_email,
    phone: customer.phone,
    websiteUrl: customer.website_url,
    planName: customer.plan_name,
    createdAt: customer.created_at ? new Date(customer.created_at) : null,
    paymentReceivedAt: customer.payment_received_at ? new Date(customer.payment_received_at) : null,
    onboardingStage: customer.onboarding_stage,
    lastActiveAt: customer.last_active_at,
  };
}

function UsageStatusBadge({ lastActiveAt }: { lastActiveAt: Date | null }) {
  const usage = getUsageStatus(lastActiveAt);
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{usage.icon}</span>
          <span className={`text-xs font-medium ${
            usage.status === 'active' ? 'text-emerald-600 dark:text-emerald-400' :
            usage.status === 'low' ? 'text-amber-600 dark:text-amber-400' :
            usage.status === 'at_risk' ? 'text-red-600 dark:text-red-400' :
            'text-muted-foreground'
          }`}>
            {usage.label}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{usage.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default function AffiliateCustomers() {
  const { affiliate, affiliateId, isLoading: affiliateLoading } = useCurrentAffiliate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<AffiliateCustomer | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    document.title = "Affiliate Customers | EverLaunch";
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["affiliate-customers", affiliateId],
    enabled: !!affiliateId,
    queryFn: async () => {
      // Get customers
      const { data: customers, error } = await supabase
        .from("customer_profiles")
        .select("id, business_name, contact_name, onboarding_stage, customer_source, created_at, payment_received_at, lead_email, phone, website_url, plan_name")
        .eq("affiliate_id", affiliateId!)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get last activity for each customer from vapi_calls
      const customerIds = (customers ?? []).map(c => c.id);
      
      if (customerIds.length === 0) {
        return [] as AffiliateCustomer[];
      }

      // Fetch last call for each customer
      const { data: lastCalls } = await supabase
        .from("vapi_calls")
        .select("customer_id, created_at")
        .in("customer_id", customerIds)
        .order("created_at", { ascending: false });

      // Create a map of customer_id -> last activity
      const lastActivityMap = new Map<string, Date>();
      (lastCalls ?? []).forEach(call => {
        if (call.customer_id && !lastActivityMap.has(call.customer_id)) {
          lastActivityMap.set(call.customer_id, new Date(call.created_at));
        }
      });

      return (customers ?? []).map(c => ({
        ...c,
        last_active_at: lastActivityMap.get(c.id) || null,
      })) as AffiliateCustomer[];
    },
  });

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter((c) => {
      const hay = [c.business_name, c.contact_name, c.onboarding_stage, c.customer_source, c.lead_email, c.phone]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [data, searchTerm]);

  // Count incomplete setups
  const incompleteCount = useMemo(() => {
    return (data ?? []).filter(c => {
      const priority = getCustomerPriority(c);
      return priority === 'urgent' || priority === 'warning' || priority === 'new';
    }).length;
  }, [data]);

  const urgentCount = useMemo(() => {
    return (data ?? []).filter(c => getCustomerPriority(c) === 'urgent').length;
  }, [data]);

  const handleCustomerClick = (customer: AffiliateCustomer) => {
    setSelectedCustomer(customer);
    setDialogOpen(true);
  };

  const handleEmailClick = (e: React.MouseEvent, customer: AffiliateCustomer) => {
    e.stopPropagation();
    if (!customer.lead_email) return;

    const affiliateName = affiliate?.username || (affiliate as any)?.first_name || 'Your EverLaunch Partner';
    const affiliateUrl = affiliate?.username ? `tryeverlaunch.com/${affiliate.username}` : 'tryeverlaunch.com';

    const subject = 'Help with your EverLaunch setup';
    const body = `Hi ${customer.contact_name || 'there'},

I'm ${affiliateName}, your EverLaunch partner. I noticed you haven't completed your setup yet.

I'm here to help! What questions can I answer?

Best regards,

${affiliateName}

---
Get your AI receptionist: ${affiliateUrl}`;

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(customer.lead_email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
  };

  const handlePhoneClick = (e: React.MouseEvent, customer: AffiliateCustomer) => {
    e.stopPropagation();
    if (customer.phone) {
      window.location.href = `tel:${customer.phone}`;
    }
  };

  if (affiliateLoading || isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-10 w-full sm:w-64" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!affiliateId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Customers
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          No affiliate context found.
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            Customers attributed to <span className="font-medium text-foreground">@{affiliate?.username ?? "your"}</span> referral link.
          </p>
        </header>

        {/* Alert Banner for Incomplete Setups */}
        {incompleteCount > 0 && (
          <Alert variant={urgentCount > 0 ? "destructive" : "default"} className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-amber-800 dark:text-amber-300">Action Needed</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              {incompleteCount} of your customer{incompleteCount > 1 ? 's haven\'t' : ' hasn\'t'} completed their setup.
              They paid but can't use the service until setup is done.
              {urgentCount > 0 && (
                <span className="block mt-1 font-medium">
                  {urgentCount} customer{urgentCount > 1 ? 's are' : ' is'} overdue (48+ hours)!
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search customers..."
            className="pl-9"
          />
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Customers ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => {
                  const priority = getCustomerPriority(c);
                  return (
                    <TableRow 
                      key={c.id} 
                      className={`cursor-pointer hover:bg-muted/50 ${priority === 'urgent' ? 'bg-destructive/5' : priority === 'warning' ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}
                      onClick={() => handleCustomerClick(c)}
                    >
                      <TableCell className="text-center">
                        {getPriorityIcon(priority)}
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="font-medium text-primary hover:underline text-left">
                              {c.business_name || "—"}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-semibold">{c.business_name || 'Unknown'}</p>
                              <p className="text-xs">{c.contact_name}</p>
                              {c.lead_email && <p className="text-xs">{c.lead_email}</p>}
                              {c.phone && <p className="text-xs">{c.phone}</p>}
                              <p className="text-xs text-muted-foreground mt-2">Click to view details</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div>{c.contact_name || "—"}</div>
                          <div className="flex items-center gap-2">
                            {c.lead_email && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={(e) => handleEmailClick(e, c)}
                                    className="text-muted-foreground hover:text-primary transition-colors"
                                  >
                                    <Mail className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Email: {c.lead_email}</p>
                                  <p className="text-xs text-muted-foreground">Click to send email</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {c.phone && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={(e) => handlePhoneClick(e, c)}
                                    className="text-muted-foreground hover:text-primary transition-colors"
                                  >
                                    <Phone className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Phone: {c.phone}</p>
                                  <p className="text-xs text-muted-foreground">Click to call</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {c.lead_email && (
                              <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                                {c.lead_email}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button onClick={(e) => { e.stopPropagation(); handleCustomerClick(c); }}>
                              {getStatusBadge(c)}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Click to view setup progress</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <UsageStatusBadge lastActiveAt={c.last_active_at} />
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.customer_source === "direct" ? "secondary" : "outline"}>
                          {c.customer_source === 'affiliate' ? `@${affiliate?.username || 'You'}` : c.customer_source || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.created_at ? (
                          <div>
                            <div>{format(new Date(c.created_at), "MMM d, yyyy")}</div>
                            {c.payment_received_at && priority !== 'complete' && priority !== 'pending' && (
                              <div className="text-xs">
                                Paid {formatDistanceToNow(new Date(c.payment_received_at))} ago
                              </div>
                            )}
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleCustomerClick(c)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {c.lead_email && (
                              <DropdownMenuItem onClick={(e) => handleEmailClick(e as any, c)}>
                                <Mail className="h-4 w-4 mr-2" />
                                Send Email
                              </DropdownMenuItem>
                            )}
                            {c.phone && (
                              <DropdownMenuItem onClick={(e) => handlePhoneClick(e as any, c)}>
                                <Phone className="h-4 w-4 mr-2" />
                                Call Customer
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleCustomerClick(c)}>
                              <HelpCircle className="h-4 w-4 mr-2" />
                              Help Complete Setup
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled>
                              <History className="h-4 w-4 mr-2" />
                              View Call History
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem disabled>
                              <FileDown className="h-4 w-4 mr-2" />
                              Download Reports
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      No customers found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <span>🔴</span> Urgent (48h+ no setup)
          </div>
          <div className="flex items-center gap-1">
            <span>⚠️</span> Warning (24-48h)
          </div>
          <div className="flex items-center gap-1">
            <span>🆕</span> New (&lt;24h)
          </div>
          <div className="flex items-center gap-1">
            <span>✅</span> Complete
          </div>
        </div>

        {/* Customer Detail Dialog */}
        <AffiliateCustomerDetailDialog
          customer={selectedCustomer ? transformToDialogData(selectedCustomer) : null}
          affiliateUsername={affiliate?.username}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      </div>
    </TooltipProvider>
  );
}
