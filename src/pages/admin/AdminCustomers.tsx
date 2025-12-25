import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, Building2, User, Phone, Mail } from "lucide-react";
import { format } from "date-fns";

interface Customer {
  id: string;
  user_id: string;
  business_name: string | null;
  contact_name: string | null;
  phone: string | null;
  lead_email: string | null;
  onboarding_stage: string | null;
  affiliate_id: string | null;
  customer_source: string | null;
  created_at: string;
  affiliate_username?: string | null;
}

export default function AdminCustomers() {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { role } = useUserRole();
  const isSuperAdmin = role === "super_admin";

  const { data: customers, isLoading } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      // Fetch customers
      const { data: customerData, error: customerError } = await supabase
        .from("customer_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (customerError) throw customerError;

      // Fetch affiliates to map IDs to usernames
      const { data: affiliates } = await supabase
        .from("affiliates")
        .select("id, username");

      const affiliateMap = new Map(
        affiliates?.map((a) => [a.id, a.username]) || []
      );

      // Map affiliate usernames to customers
      return (customerData || []).map((c) => ({
        ...c,
        affiliate_username: c.affiliate_id
          ? affiliateMap.get(c.affiliate_id)
          : null,
      })) as Customer[];
    },
  });

  const handleViewAs = async (customer: Customer) => {
    // Log the impersonation
    await supabase.from("audit_logs").insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      action: "impersonate_customer",
      resource_type: "customer",
      resource_id: customer.id,
      details: {
        customer_business: customer.business_name,
        customer_user_id: customer.user_id,
      },
    });

    // Store impersonation data
    localStorage.setItem(
      "impersonation",
      JSON.stringify({
        customerId: customer.id,
        customerName: customer.business_name || customer.contact_name || "Customer",
        returnPath: "/admin/customers",
      })
    );

    navigate("/customer");
  };

  const filteredCustomers = customers?.filter((customer) => {
    const search = searchTerm.toLowerCase();
    return (
      customer.business_name?.toLowerCase().includes(search) ||
      customer.contact_name?.toLowerCase().includes(search) ||
      customer.lead_email?.toLowerCase().includes(search) ||
      customer.phone?.includes(search) ||
      customer.affiliate_username?.toLowerCase().includes(search)
    );
  });

  const getOnboardingBadge = (stage: string | null) => {
    switch (stage) {
      case "completed":
        return <Badge className="bg-green-500/20 text-green-400">Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-500/20 text-blue-400">In Progress</Badge>;
      case "pending_portal_entry":
        return <Badge className="bg-yellow-500/20 text-yellow-400">Pending</Badge>;
      default:
        return <Badge variant="secondary">{stage || "Unknown"}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-muted-foreground">
            {customers?.length || 0} total customers
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Onboarding</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Joined</TableHead>
              {isSuperAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isSuperAdmin ? 6 : 5} className="text-center py-8 text-muted-foreground">
                  No customers found
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers?.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {customer.business_name || "No business name"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {customer.contact_name && (
                        <div className="flex items-center gap-1.5 text-sm">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {customer.contact_name}
                        </div>
                      )}
                      {customer.lead_email && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {customer.lead_email}
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {customer.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getOnboardingBadge(customer.onboarding_stage)}</TableCell>
                  <TableCell>
                    {customer.customer_source === 'direct' || !customer.affiliate_username ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        Direct
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="font-mono text-blue-400 border-blue-500/30">
                        @{customer.affiliate_username}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(customer.created_at), "MMM d, yyyy")}
                  </TableCell>
                  {isSuperAdmin && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewAs(customer)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View As
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
