import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Network, 
  AlertCircle, 
  ChevronDown, 
  ChevronRight,
  Users,
  Calendar,
  DollarSign
} from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AffiliateWithGenealogy {
  id: string;
  username: string;
  user_id: string;
  created_at: string;
  affiliate_plan_id: string | null;
  commission_plan_id: string | null;
  parent_affiliate_id: string | null;
  affiliate_plan?: { name: string } | null;
  commission_plan?: { name: string } | null;
  parent?: { username: string } | null;
  tier1_count?: number;
  tier2_count?: number;
  tier3_count?: number;
}

function useCompanyGenealogy() {
  return useQuery({
    queryKey: ['company-genealogy'],
    queryFn: async () => {
      // Get all affiliates with their plan info
      const { data: affiliates, error } = await supabase
        .from('affiliates')
        .select(`
          id,
          username,
          user_id,
          created_at,
          affiliate_plan_id,
          commission_plan_id,
          parent_affiliate_id
        `)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!affiliates) return [];

      // Get plans
      const { data: affiliatePlans } = await supabase
        .from('affiliate_plans')
        .select('id, name');
      
      const { data: commissionPlans } = await supabase
        .from('commission_plans')
        .select('id, name');

      // Get genealogy counts for each affiliate
      const { data: genealogyData } = await supabase
        .from('genealogy')
        .select('affiliate_id, upline_level1, upline_level2, upline_level3');

      // Build enhanced affiliate list
      const affiliatePlanMap = new Map(affiliatePlans?.map(p => [p.id, p.name]) || []);
      const commissionPlanMap = new Map(commissionPlans?.map(p => [p.id, p.name]) || []);
      const affiliateMap = new Map(affiliates.map(a => [a.id, a]));

      // Count downlines
      const tier1Counts = new Map<string, number>();
      const tier2Counts = new Map<string, number>();
      const tier3Counts = new Map<string, number>();

      genealogyData?.forEach(g => {
        if (g.upline_level1) {
          tier1Counts.set(g.upline_level1, (tier1Counts.get(g.upline_level1) || 0) + 1);
        }
        if (g.upline_level2) {
          tier2Counts.set(g.upline_level2, (tier2Counts.get(g.upline_level2) || 0) + 1);
        }
        if (g.upline_level3) {
          tier3Counts.set(g.upline_level3, (tier3Counts.get(g.upline_level3) || 0) + 1);
        }
      });

      return affiliates.map(a => ({
        ...a,
        affiliate_plan: a.affiliate_plan_id ? { name: affiliatePlanMap.get(a.affiliate_plan_id) || 'Unknown' } : null,
        commission_plan: a.commission_plan_id ? { name: commissionPlanMap.get(a.commission_plan_id) || 'Unknown' } : null,
        parent: a.parent_affiliate_id ? { username: affiliateMap.get(a.parent_affiliate_id)?.username || 'Unknown' } : null,
        tier1_count: tier1Counts.get(a.id) || 0,
        tier2_count: tier2Counts.get(a.id) || 0,
        tier3_count: tier3Counts.get(a.id) || 0,
      })) as AffiliateWithGenealogy[];
    },
  });
}

function AffiliateRow({ 
  affiliate, 
  level = 0,
  isExpanded,
  onToggle,
  hasChildren
}: { 
  affiliate: AffiliateWithGenealogy;
  level?: number;
  isExpanded: boolean;
  onToggle: () => void;
  hasChildren: boolean;
}) {
  const totalDownline = (affiliate.tier1_count || 0) + (affiliate.tier2_count || 0) + (affiliate.tier3_count || 0);

  return (
    <TableRow className={cn(level > 0 && 'bg-muted/30')}>
      <TableCell>
        <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 20}px` }}>
          {hasChildren ? (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onToggle}>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <span className="w-6" />
          )}
          <span className="font-medium">{affiliate.username}</span>
        </div>
      </TableCell>
      <TableCell>
        {affiliate.parent?.username ? (
          <span className="text-muted-foreground">{affiliate.parent.username}</span>
        ) : (
          <Badge variant="outline">Root</Badge>
        )}
      </TableCell>
      <TableCell className="text-center">{affiliate.tier1_count || 0}</TableCell>
      <TableCell className="text-center">{affiliate.tier2_count || 0}</TableCell>
      <TableCell className="text-center">{affiliate.tier3_count || 0}</TableCell>
      <TableCell className="text-center font-bold">{totalDownline}</TableCell>
      <TableCell>
        {format(new Date(affiliate.created_at), 'MMM d, yyyy')}
      </TableCell>
      <TableCell>
        <Badge variant="secondary">
          {affiliate.affiliate_plan?.name || 'No Plan'}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant="outline">
          {affiliate.commission_plan?.name || 'Default'}
        </Badge>
      </TableCell>
    </TableRow>
  );
}

export default function AdminGenealogy() {
  const { role, isLoading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { data: affiliates = [], isLoading } = useCompanyGenealogy();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Only super_admin can access
  if (roleLoading || isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (role !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-medium">Access Denied</h3>
        <p className="text-muted-foreground max-w-sm mt-2">
          Only Super Admins can access the company genealogy.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>
          Go to Dashboard
        </Button>
      </div>
    );
  }

  // Build tree structure
  const rootAffiliates = affiliates.filter(a => !a.parent_affiliate_id);
  const childrenMap = new Map<string, AffiliateWithGenealogy[]>();
  affiliates.forEach(a => {
    if (a.parent_affiliate_id) {
      const siblings = childrenMap.get(a.parent_affiliate_id) || [];
      siblings.push(a);
      childrenMap.set(a.parent_affiliate_id, siblings);
    }
  });

  const renderTree = (affiliate: AffiliateWithGenealogy, level = 0): React.ReactNode[] => {
    const children = childrenMap.get(affiliate.id) || [];
    const isExpanded = expandedIds.has(affiliate.id);
    const hasChildren = children.length > 0;

    const rows: React.ReactNode[] = [
      <AffiliateRow
        key={affiliate.id}
        affiliate={affiliate}
        level={level}
        isExpanded={isExpanded}
        onToggle={() => toggleExpanded(affiliate.id)}
        hasChildren={hasChildren}
      />
    ];

    if (isExpanded && hasChildren) {
      children.forEach(child => {
        rows.push(...renderTree(child, level + 1));
      });
    }

    return rows;
  };

  // Stats
  const totalAffiliates = affiliates.length;
  const rootCount = rootAffiliates.length;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Company Genealogy</h1>
        <p className="text-muted-foreground">Complete affiliate network visualization</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Affiliates</p>
                <p className="text-2xl font-bold">{totalAffiliates}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Network className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Root Affiliates</p>
                <p className="text-2xl font-bold">{rootCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Network Depth</p>
                <p className="text-2xl font-bold">3 Tiers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Genealogy Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Affiliate Network Tree
          </CardTitle>
          <CardDescription>
            Expand rows to view downline structure
          </CardDescription>
        </CardHeader>
        <CardContent>
          {affiliates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No Affiliates Yet</h3>
              <p className="text-muted-foreground max-w-sm mt-2">
                Affiliates will appear here once they sign up.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Sponsor</TableHead>
                    <TableHead className="text-center">Tier 1</TableHead>
                    <TableHead className="text-center">Tier 2</TableHead>
                    <TableHead className="text-center">Tier 3</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Comp Plan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rootAffiliates.flatMap(a => renderTree(a))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
