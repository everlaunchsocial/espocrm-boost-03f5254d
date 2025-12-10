import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, TrendingDown, Users, CreditCard, UserCheck, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface SignupEvent {
  id: string;
  email: string | null;
  username: string | null;
  plan: string | null;
  referrer: string | null;
  event_name: string;
  step: string | null;
  created_at: string;
}

const eventBadgeColor: Record<string, string> = {
  signup_started: 'bg-blue-500/10 text-blue-500',
  stripe_redirect: 'bg-yellow-500/10 text-yellow-500',
  payment_completed: 'bg-green-500/10 text-green-500',
  account_created: 'bg-primary/10 text-primary',
};

const stepIcons: Record<string, React.ReactNode> = {
  account_form: <Users className="h-4 w-4" />,
  stripe_checkout: <CreditCard className="h-4 w-4" />,
  payment: <CreditCard className="h-4 w-4" />,
  complete: <UserCheck className="h-4 w-4" />,
};

export default function SignupAnalytics() {
  const [events, setEvents] = useState<SignupEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from('signup_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('Error loading signup events:', error);
    } else {
      setEvents(data || []);
    }
    setIsLoading(false);
  };

  // Group events by email/username to identify abandonments vs completions
  const { abandonments, completedSignups, stats } = useMemo(() => {
    // Group by email (or username as fallback)
    const userSessions: Record<string, SignupEvent[]> = {};
    
    events.forEach(event => {
      const key = event.email || event.username || event.id;
      if (!userSessions[key]) {
        userSessions[key] = [];
      }
      userSessions[key].push(event);
    });

    const abandonmentList: { key: string; events: SignupEvent[]; lastStep: string }[] = [];
    const completedList: { key: string; events: SignupEvent[] }[] = [];

    Object.entries(userSessions).forEach(([key, userEvents]) => {
      const hasPaymentCompleted = userEvents.some(e => e.event_name === 'payment_completed');
      const hasAccountCreated = userEvents.some(e => e.event_name === 'account_created');
      const hasSignupStarted = userEvents.some(e => e.event_name === 'signup_started');

      if (hasPaymentCompleted || hasAccountCreated) {
        completedList.push({ key, events: userEvents });
      } else if (hasSignupStarted) {
        // Determine last step reached
        const hasStripeRedirect = userEvents.some(e => e.event_name === 'stripe_redirect');
        const lastStep = hasStripeRedirect ? 'stripe_checkout' : 'account_form';
        abandonmentList.push({ key, events: userEvents, lastStep });
      }
    });

    // Calculate stats
    const signupStarted = events.filter(e => e.event_name === 'signup_started').length;
    const accountCreated = events.filter(e => e.event_name === 'account_created').length;
    const stripeRedirects = events.filter(e => e.event_name === 'stripe_redirect').length;
    const abandonmentRate = signupStarted > 0 
      ? Math.round(((signupStarted - accountCreated) / signupStarted) * 100) 
      : 0;

    return {
      abandonments: abandonmentList,
      completedSignups: completedList,
      stats: { signupStarted, accountCreated, stripeRedirects, abandonmentRate }
    };
  }, [events]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Signup Analytics</h1>
        <p className="text-muted-foreground">Track affiliate signup funnel and abandonment</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Signups Started
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.signupStarted}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Accounts Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.accountCreated}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Abandonment Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-destructive" />
              <span className="text-2xl font-bold text-destructive">{stats.abandonmentRate}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Stripe Redirects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats.stripeRedirects}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Abandonments and Completed */}
      <Tabs defaultValue="abandonments" className="w-full">
        <TabsList>
          <TabsTrigger value="abandonments" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Abandonments ({abandonments.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Completed Signups ({completedSignups.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="abandonments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Users Who Started But Didn't Complete</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Last Step</TableHead>
                    <TableHead>Referrer</TableHead>
                    <TableHead>Started At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {abandonments.map(({ key, events: userEvents, lastStep }) => {
                    const firstEvent = userEvents[userEvents.length - 1]; // Oldest event
                    return (
                      <TableRow key={key}>
                        <TableCell className="font-mono text-sm">{firstEvent.email || '-'}</TableCell>
                        <TableCell className="font-mono text-sm">{firstEvent.username || '-'}</TableCell>
                        <TableCell>
                          {firstEvent.plan && (
                            <Badge variant="outline" className="capitalize">{firstEvent.plan}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={lastStep === 'stripe_checkout' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-500/10 text-blue-500'}>
                            {lastStep === 'stripe_checkout' ? 'Stripe Checkout' : 'Account Form'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{firstEvent.referrer || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(firstEvent.created_at), 'MMM d, h:mm a')}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {abandonments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No abandonments recorded
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Successful Signups</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Referrer</TableHead>
                    <TableHead>Completed At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedSignups.map(({ key, events: userEvents }) => {
                    const completedEvent = userEvents.find(e => e.event_name === 'account_created') || userEvents[0];
                    return (
                      <TableRow key={key}>
                        <TableCell className="font-mono text-sm">{completedEvent.email || '-'}</TableCell>
                        <TableCell className="font-mono text-sm">{completedEvent.username || '-'}</TableCell>
                        <TableCell>
                          {completedEvent.plan && (
                            <Badge variant="outline" className="capitalize">{completedEvent.plan}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{completedEvent.referrer || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(completedEvent.created_at), 'MMM d, h:mm a')}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {completedSignups.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No completed signups yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
