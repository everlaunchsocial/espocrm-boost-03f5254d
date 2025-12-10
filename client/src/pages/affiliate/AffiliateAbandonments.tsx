import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, UserX, Mail, RefreshCw } from 'lucide-react';
import { useAffiliateAbandonments } from '@/hooks/useAffiliateAbandonments';

export default function AffiliateAbandonments() {
  const navigate = useNavigate();
  const { abandonments, unviewedCount, isLoading, refetch, markAllAsViewed } = useAffiliateAbandonments();

  // Mark all as viewed when page loads
  useEffect(() => {
    if (!isLoading && unviewedCount > 0) {
      markAllAsViewed();
    }
  }, [isLoading, unviewedCount, markAllAsViewed]);

  const getStepLabel = (step: string | null, eventName: string) => {
    if (eventName === 'stripe_redirect') return 'Stripe Checkout';
    if (step === 'account_form') return 'Account Form';
    if (step === 'stripe_checkout') return 'Stripe Checkout';
    return step || 'Unknown';
  };

  const getStepBadgeVariant = (step: string | null, eventName: string) => {
    if (eventName === 'stripe_redirect' || step === 'stripe_checkout') {
      return 'destructive'; // Red - closest to completing
    }
    return 'secondary'; // Gray - earlier in funnel
  };

  const handleRowClick = (abandonment: typeof abandonments[0]) => {
    // Navigate to leads with pre-fill for follow-up
    // For now, just show leads page - could create a contact if needed
    navigate('/affiliate/leads', { 
      state: { 
        prefillEmail: abandonment.email,
        prefillName: abandonment.username 
      } 
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Signup Abandonments</h1>
          <p className="text-muted-foreground">
            People who clicked your referral link but didn't complete signup
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5 text-destructive" />
            Abandoned Signups
          </CardTitle>
          <CardDescription>
            {abandonments.length === 0
              ? 'No abandonments yet - great job!'
              : `${abandonments.length} people started but didn't complete signup`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {abandonments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserX className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No abandoned signups from your referral links.</p>
              <p className="text-sm mt-2">
                When someone clicks your link but doesn't complete signup, they'll appear here.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name/Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Plan Selected</TableHead>
                  <TableHead>Abandoned At</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {abandonments.map((abandonment) => (
                  <TableRow
                    key={abandonment.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(abandonment)}
                  >
                    <TableCell className="font-medium">
                      {abandonment.username || '-'}
                    </TableCell>
                    <TableCell>
                      {abandonment.email || '-'}
                    </TableCell>
                    <TableCell>
                      {abandonment.plan ? (
                        <Badge variant="outline" className="capitalize">
                          {abandonment.plan}
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStepBadgeVariant(abandonment.step, abandonment.event_name)}>
                        {getStepLabel(abandonment.step, abandonment.event_name)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {abandonment.created_at
                        ? format(new Date(abandonment.created_at), 'MMM d, yyyy h:mm a')
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {abandonment.email && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `mailto:${abandonment.email}`;
                          }}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
