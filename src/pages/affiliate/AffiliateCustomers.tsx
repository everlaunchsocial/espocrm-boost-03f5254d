import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Search, Users } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentAffiliate } from "@/hooks/useCurrentAffiliate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AffiliateCustomer {
  id: string;
  business_name: string | null;
  contact_name: string | null;
  onboarding_stage: string | null;
  customer_source: string | null;
  created_at: string;
}

function getOnboardingBadge(stage: string | null) {
  if (!stage) return <Badge variant="secondary">Unknown</Badge>;

  const normalized = stage.toLowerCase();
  if (normalized.includes("complete") || normalized.includes("done")) {
    return <Badge>Complete</Badge>;
  }
  if (normalized.includes("pending")) {
    return <Badge variant="secondary">Pending</Badge>;
  }
  if (normalized.includes("setup") || normalized.includes("wizard")) {
    return <Badge variant="outline">In Setup</Badge>;
  }
  return <Badge variant="outline">{stage}</Badge>;
}

export default function AffiliateCustomers() {
  const { affiliate, affiliateId, isLoading: affiliateLoading } = useCurrentAffiliate();
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    document.title = "Affiliate Customers | EverLaunch";
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["affiliate-customers", affiliateId],
    enabled: !!affiliateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_profiles")
        .select("id, business_name, contact_name, onboarding_stage, customer_source, created_at")
        .eq("affiliate_id", affiliateId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as AffiliateCustomer[];
    },
  });

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter((c) => {
      const hay = [c.business_name, c.contact_name, c.onboarding_stage, c.customer_source]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [data, searchTerm]);

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
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
        <p className="text-muted-foreground">
          Customers attributed to <span className="font-medium text-foreground">{affiliate?.username ?? "your"}</span> referral link.
        </p>
      </header>

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
                <TableHead>Business</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.business_name || "—"}</TableCell>
                  <TableCell>{c.contact_name || "—"}</TableCell>
                  <TableCell>{getOnboardingBadge(c.onboarding_stage)}</TableCell>
                  <TableCell>
                    <Badge variant={c.customer_source === "direct" ? "secondary" : "outline"}>
                      {c.customer_source || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.created_at ? format(new Date(c.created_at), "MMM d, yyyy") : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    No customers found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
