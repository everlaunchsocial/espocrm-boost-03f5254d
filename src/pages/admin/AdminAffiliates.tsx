import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, Search, Users } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Affiliate {
  id: string;
  username: string;
  user_id: string;
  created_at: string;
  parent_affiliate_id: string | null;
  affiliate_plan_id: string | null;
  demo_credits_balance: number | null;
  is_company_account: boolean | null;
  customer_count?: number;
}

export default function AdminAffiliates() {
  const navigate = useNavigate();
  const { role } = useUserRole();
  const [searchTerm, setSearchTerm] = useState('');
  const isSuperAdmin = role === 'super_admin';

  const { data: affiliates, isLoading } = useQuery({
    queryKey: ['admin-affiliates'],
    queryFn: async () => {
      // Fetch affiliates (exclude company accounts)
      const { data: affiliateData, error } = await supabase
        .from('affiliates')
        .select('*')
        .eq('is_company_account', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch customer counts per affiliate
      const { data: customerCounts } = await supabase
        .from('customer_profiles')
        .select('affiliate_id');

      // Count customers per affiliate
      const countMap = new Map<string, number>();
      customerCounts?.forEach((c) => {
        if (c.affiliate_id) {
          countMap.set(c.affiliate_id, (countMap.get(c.affiliate_id) || 0) + 1);
        }
      });

      return (affiliateData || []).map((a) => ({
        ...a,
        customer_count: countMap.get(a.id) || 0,
      })) as Affiliate[];
    },
  });

  const handleViewAs = async (affiliate: Affiliate) => {
    // Log impersonation start
    try {
      await supabase.from('impersonation_logs').insert({
        admin_user_id: (await supabase.auth.getUser()).data.user?.id,
        impersonated_affiliate_id: affiliate.id,
        impersonated_username: affiliate.username,
        action: 'start',
        user_agent: navigator.userAgent,
      });
    } catch (err) {
      console.error('Failed to log impersonation start:', err);
    }

    // Store impersonation data in localStorage
    localStorage.setItem('impersonating_affiliate_id', affiliate.id);
    localStorage.setItem('impersonating_affiliate_username', affiliate.username);
    
    toast.success(`Now viewing as ${affiliate.username}`);
    navigate('/affiliate');
  };

  const filteredAffiliates = affiliates?.filter(affiliate =>
    affiliate.username.toLowerCase().includes(searchTerm.toLowerCase())
  ) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-64" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Affiliates</h1>
          <p className="text-muted-foreground">Manage all affiliates in the system</p>
        </div>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search affiliates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 w-full sm:w-64"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Affiliates ({filteredAffiliates.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Customers</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Joined</TableHead>
                {isSuperAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAffiliates.map((affiliate) => (
                <TableRow key={affiliate.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{affiliate.username}</span>
                      {affiliate.parent_affiliate_id && (
                        <Badge variant="outline" className="text-xs">
                          Referred
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={affiliate.customer_count ? "default" : "secondary"}>
                      {affiliate.customer_count || 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {affiliate.demo_credits_balance !== null ? (
                      <Badge variant="secondary">
                        {affiliate.demo_credits_balance} credits
                      </Badge>
                    ) : (
                      <Badge variant="outline">Unlimited</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(affiliate.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  {isSuperAdmin && (
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewAs(affiliate)}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        View As
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {filteredAffiliates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 5 : 4} className="text-center py-8 text-muted-foreground">
                    No affiliates found
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
