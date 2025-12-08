import { useCustomerOnboarding } from '@/hooks/useCustomerOnboarding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Phone, 
  MessageSquare, 
  Calendar, 
  Users, 
  TrendingUp, 
  Clock,
  BarChart3
} from 'lucide-react';

export default function CustomerDashboard() {
  const { isLoading, customerProfile, twilioNumber } = useCustomerOnboarding();

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome, {customerProfile?.contact_name || 'there'}!
          </h1>
          <p className="text-muted-foreground">
            {customerProfile?.business_name} Dashboard
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Calls
              </CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Chat Sessions
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Leads Captured
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Appointments
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Scheduled</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* AI Phone Number */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                Your AI Phone Number
              </CardTitle>
              <CardDescription>
                Customers can call this number to speak with your AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-mono font-bold text-primary">
                {twilioNumber || 'Pending Assignment'}
              </p>
              {!twilioNumber && (
                <p className="text-sm text-muted-foreground mt-2">
                  Your number will be assigned shortly.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Minutes Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Minutes Usage
              </CardTitle>
              <CardDescription>
                Your current billing period usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold">0</span>
                <span className="text-muted-foreground mb-1">
                  / {customerProfile?.minutes_included || 300} minutes
                </span>
              </div>
              <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: '0%' }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest interactions with your AI assistant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <TrendingUp className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                No activity yet. Once your AI starts receiving calls and chats, they'll appear here.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}