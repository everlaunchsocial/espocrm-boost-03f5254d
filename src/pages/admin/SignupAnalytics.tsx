import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingDown, Users, CreditCard, UserCheck } from 'lucide-react';
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

interface StepStats {
  step: string;
  count: number;
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
  const [filterEvent, setFilterEvent] = useState<string>('all');
  const [stepStats, setStepStats] = useState<StepStats[]>([]);

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
      calculateStats(data || []);
    }
    setIsLoading(false);
  };

  const calculateStats = (data: SignupEvent[]) => {
    const stepCounts: Record<string, number> = {};
    
    data.forEach(event => {
      const step = event.step || 'unknown';
      stepCounts[step] = (stepCounts[step] || 0) + 1;
    });

    const stats = Object.entries(stepCounts).map(([step, count]) => ({
      step,
      count,
    }));

    setStepStats(stats);
  };

  const filteredEvents = filterEvent === 'all' 
    ? events 
    : events.filter(e => e.event_name === filterEvent);

  // Calculate abandonment rate
  const signupStarted = events.filter(e => e.event_name === 'signup_started').length;
  const accountCreated = events.filter(e => e.event_name === 'account_created').length;
  const abandonmentRate = signupStarted > 0 
    ? Math.round(((signupStarted - accountCreated) / signupStarted) * 100) 
    : 0;

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
            <div className="text-2xl font-bold">{signupStarted}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Accounts Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{accountCreated}</div>
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
              <span className="text-2xl font-bold text-destructive">{abandonmentRate}%</span>
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
            <div className="text-2xl font-bold text-yellow-500">
              {events.filter(e => e.event_name === 'stripe_redirect').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Step Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Abandonment by Step</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stepStats.map(stat => (
              <div key={stat.step} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  {stepIcons[stat.step] || <Users className="h-4 w-4" />}
                </div>
                <div>
                  <p className="font-medium capitalize">{stat.step.replace('_', ' ')}</p>
                  <p className="text-2xl font-bold">{stat.count}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Events</CardTitle>
          <Select value={filterEvent} onValueChange={setFilterEvent}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by event" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="signup_started">Signup Started</SelectItem>
              <SelectItem value="stripe_redirect">Stripe Redirect</SelectItem>
              <SelectItem value="payment_completed">Payment Completed</SelectItem>
              <SelectItem value="account_created">Account Created</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Referrer</TableHead>
                <TableHead>Step</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.map(event => (
                <TableRow key={event.id}>
                  <TableCell>
                    <Badge className={eventBadgeColor[event.event_name] || ''}>
                      {event.event_name.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{event.email || '-'}</TableCell>
                  <TableCell className="font-mono text-sm">{event.username || '-'}</TableCell>
                  <TableCell>
                    {event.plan && (
                      <Badge variant="outline" className="capitalize">{event.plan}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{event.referrer || '-'}</TableCell>
                  <TableCell className="capitalize">{event.step?.replace('_', ' ') || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(event.created_at), 'MMM d, h:mm a')}
                  </TableCell>
                </TableRow>
              ))}
              {filteredEvents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No signup events recorded yet
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