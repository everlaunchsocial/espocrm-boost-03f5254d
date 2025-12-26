import { useCustomerOnboarding } from '@/hooks/useCustomerOnboarding';
import { useCustomerDashboardData } from '@/hooks/useCustomerDashboardData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { PipelineStatusBadge } from '@/components/crm/PipelineStatusBadge';
import { SetupChecklist } from '@/components/customer/SetupChecklist';
import { UsageUpgradePrompt } from '@/components/customer/UsageUpgradePrompt';
import { 
  Phone, 
  MessageSquare, 
  Users, 
  TrendingUp, 
  Clock,
  BarChart3,
  Mic,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export default function CustomerDashboard() {
  const { 
    isLoading: onboardingLoading, 
    customerProfile, 
    twilioNumber,
    voiceSettings,
    chatSettings,
    calendarIntegration,
    knowledgeSources
  } = useCustomerOnboarding();
  const { 
    billing, 
    billingLoading, 
    activity, 
    activityLoading,
    recentLeads,
    recentLeadsLoading 
  } = useCustomerDashboardData();

  const isLoading = onboardingLoading || billingLoading;

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  // Calculate usage percentage
  const minutesUsed = billing?.total_minutes_used || 0;
  const minutesIncluded = billing?.minutes_included || customerProfile?.minutes_included || 300;
  const usagePercent = Math.min((minutesUsed / minutesIncluded) * 100, 100);
  const overageMinutes = billing?.overage_minutes || Math.max(0, minutesUsed - minutesIncluded);
  const hasOverage = overageMinutes > 0;

  // Format billing period
  const billingStart = billing?.billing_cycle_start 
    ? format(new Date(billing.billing_cycle_start), 'MMM d, yyyy')
    : 'Not set';
  const billingEnd = billing?.billing_cycle_end
    ? format(new Date(billing.billing_cycle_end), 'MMM d, yyyy')
    : 'Not set';

  // Calculate checklist completion status - matches onboarding wizard steps exactly
  
  // Step 1: Business Profile - Complete if business_name AND business_type are set
  const businessProfileComplete = !!(customerProfile?.business_name && customerProfile?.business_type);
  
  // Step 2: Voice & Personality - Complete if voice_gender is configured
  const voiceComplete = !!(voiceSettings?.voice_gender || voiceSettings?.voice_style);
  
  // Step 3: Knowledge & Content - Complete if website URL exists OR has document knowledge
  const hasWebsiteKnowledge = !!customerProfile?.website_url;
  const hasDocumentKnowledge = knowledgeSources.some(s => s.source_type === 'document');
  const knowledgeComplete = hasWebsiteKnowledge || hasDocumentKnowledge;
  
  // Step 4: Lead Capture - Complete if lead_capture_enabled OR has notification configured
  const leadsComplete = !!(customerProfile?.lead_capture_enabled || customerProfile?.lead_email || customerProfile?.lead_sms_number);
  
  // Step 5: Calendar - Optional - complete if provider is set OR marked as disabled
  const calendarOptional = true; // Calendar is always optional
  const calendarComplete = !!(calendarIntegration?.provider || calendarIntegration?.appointments_enabled === false);
  
  // Step 6: Deploy - Complete if embed installed OR phone provisioned
  const deployComplete = !!(customerProfile?.embed_installed_at || twilioNumber);

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {customerProfile?.contact_name || 'there'}!
          </h1>
          <p className="text-muted-foreground">
            {customerProfile?.business_name} Dashboard
          </p>
        </div>

        {/* Setup Checklist */}
        <SetupChecklist
          businessProfileComplete={businessProfileComplete}
          voiceComplete={voiceComplete}
          knowledgeComplete={knowledgeComplete}
          leadsComplete={leadsComplete}
          calendarComplete={calendarComplete}
          calendarOptional={calendarOptional}
          deployComplete={deployComplete}
        />

        {/* Usage Upgrade Prompt */}
        {billing && (
          <UsageUpgradePrompt
            minutesUsed={minutesUsed}
            minutesIncluded={minutesIncluded}
            planName={billing.plan_name || 'Starter'}
          />
        )}

        {/* Top Row: Plan & Usage + Activity Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Plan & Usage Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Plan & Usage
              </CardTitle>
              <CardDescription>
                Your current plan and minutes usage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {billing ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Your Plan</span>
                    <span className="font-semibold text-foreground capitalize">
                      {billing.plan_name || 'Starter'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Billing Period</span>
                    <span className="text-sm text-foreground">
                      {billingStart} – {billingEnd}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Minutes Used</span>
                      <span className="font-semibold text-foreground">
                        {Math.round(minutesUsed)} of {minutesIncluded}
                      </span>
                    </div>
                    <Progress value={usagePercent} className="h-2" />
                  </div>

                  {hasOverage && (
                    <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        You've used {minutesIncluded} included minutes and {Math.round(overageMinutes)} overage minutes this period.
                      </p>
                    </div>
                  )}

                  {/* Phone Number */}
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Your AI Phone Number</span>
                      <span className="font-mono font-semibold text-primary">
                        {twilioNumber || 'Pending'}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                  <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    We couldn't find your subscription details. Please contact support.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                This Month's Activity
              </CardTitle>
              <CardDescription>
                Interactions handled by your AI assistant
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              ) : activity && (activity.phoneCalls > 0 || activity.webChats > 0 || activity.voiceWeb > 0) ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Phone className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{activity.phoneCalls}</p>
                      <p className="text-xs text-muted-foreground">Phone Calls</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <MessageSquare className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{activity.webChats}</p>
                      <p className="text-xs text-muted-foreground">Web Chats</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Mic className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{activity.voiceWeb}</p>
                      <p className="text-xs text-muted-foreground">Voice Web</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{activity.leadsCapured}</p>
                      <p className="text-xs text-muted-foreground">Leads Captured</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <TrendingUp className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Once your AI starts handling calls and chats, activity will appear here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Leads Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Recent Leads
              </CardTitle>
              <CardDescription>
                Latest leads captured by your AI assistant
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/customer/leads" className="flex items-center gap-1">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentLeadsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : recentLeads.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Date</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Name</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Phone</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Source</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLeads.map(lead => (
                      <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-3 px-3 text-sm">
                          {format(new Date(lead.created_at), 'MMM d, h:mm a')}
                        </td>
                        <td className="py-3 px-3 text-sm font-medium">
                          {lead.first_name} {lead.last_name}
                        </td>
                        <td className="py-3 px-3 text-sm text-muted-foreground">
                          {lead.phone || '—'}
                        </td>
                        <td className="py-3 px-3 text-sm">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            {lead.source}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-sm">
                          <PipelineStatusBadge status={lead.pipeline_status || 'new_lead'} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground mb-1">No leads captured yet</p>
                <p className="text-xs text-muted-foreground">
                  When your AI captures lead information, they'll appear here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
