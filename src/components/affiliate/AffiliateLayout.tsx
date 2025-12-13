import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { SupportChatWidget } from '@/components/SupportChatWidget';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  CalendarDays,
  Mail,
  Users,
  Building2,
  UserPlus,
  Presentation,
  Handshake,
  CheckSquare,
  DollarSign,
  GraduationCap,
  Settings,
  Menu,
  X,
  ChevronDown,
  Bell,
  Search,
  LogOut,
  User,
  Copy,
  ExternalLink,
  UserX,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import { useAffiliateAbandonments } from '@/hooks/useAffiliateAbandonments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUserRole } from '@/hooks/useUserRole';
import { useCurrentAffiliate } from '@/hooks/useCurrentAffiliate';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ImpersonationBanner } from '@/components/ImpersonationBanner';

interface AffiliateLayoutProps {
  children?: ReactNode;
}

const affiliateNavigation = [
  { name: 'Dashboard', href: '/affiliate', icon: LayoutDashboard },
  { name: 'Abandonments', href: '/affiliate/abandonments', icon: UserX, hasBadge: true },
  { name: 'Calendar', href: '/affiliate/calendar', icon: CalendarDays },
  { name: 'Email', href: '/affiliate/email', icon: Mail },
  { name: 'Contacts', href: '/affiliate/contacts', icon: Users },
  { name: 'Accounts', href: '/affiliate/accounts', icon: Building2 },
  { name: 'Leads', href: '/affiliate/leads', icon: UserPlus },
  { name: 'Deals', href: '/affiliate/deals', icon: Handshake },
  { name: 'Tasks', href: '/affiliate/tasks', icon: CheckSquare },
  { name: 'Demos', href: '/affiliate/demos', icon: Presentation },
  { name: 'Sales Tools', href: '/affiliate/sales-tools', icon: Sparkles },
  { name: 'Commissions', href: '/affiliate/commissions', icon: DollarSign },
  { name: 'Team', href: '/affiliate/team', icon: Users },
  { name: 'How-To', href: '/affiliate/training', icon: GraduationCap },
  { name: 'Billing', href: '/affiliate/billing', icon: CreditCard },
  { name: 'Settings', href: '/affiliate/settings', icon: Settings },
];

export function AffiliateLayout({ children }: AffiliateLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { role, isLoading, userId } = useUserRole();
  const { affiliate: currentAffiliate, isLoading: affiliateLoading, isImpersonating } = useCurrentAffiliate();
  const { unviewedCount: abandonmentCount } = useAffiliateAbandonments();

  // State for affiliate data
  const [affiliateData, setAffiliateData] = useState<{ 
    username: string; 
    parent_affiliate_id: string | null;
    demo_credits_remaining: number | null;
    affiliate_plan_id: string | null;
  } | null>(null);
  const [sponsorName, setSponsorName] = useState<string | null>(null);
  const [planCode, setPlanCode] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  // Fetch affiliate and sponsor data - use impersonated affiliate if applicable
  useEffect(() => {
    const fetchAffiliateData = async () => {
      // If impersonating, use the currentAffiliate from the hook
      if (isImpersonating && currentAffiliate) {
        console.log('[AffiliateLayout] Using impersonated affiliate:', currentAffiliate);
        setAffiliateData({
          username: currentAffiliate.username,
          parent_affiliate_id: currentAffiliate.parent_affiliate_id,
          demo_credits_remaining: (currentAffiliate as any).demo_credits_remaining ?? null,
          affiliate_plan_id: (currentAffiliate as any).affiliate_plan_id ?? null,
        });

        // Fetch plan code if we have a plan_id
        if ((currentAffiliate as any).affiliate_plan_id) {
          const { data: plan } = await supabase
            .from('affiliate_plans')
            .select('code')
            .eq('id', (currentAffiliate as any).affiliate_plan_id)
            .maybeSingle();
          setPlanCode(plan?.code || null);
        }

        // Fetch sponsor if exists
        if (currentAffiliate.parent_affiliate_id) {
          const { data: sponsor } = await supabase
            .from('affiliates')
            .select('username')
            .eq('id', currentAffiliate.parent_affiliate_id)
            .maybeSingle();
          setSponsorName(sponsor?.username || null);
        } else {
          setSponsorName(null);
        }
        setDataLoading(false);
        return;
      }

      // Don't fetch until we have a userId
      if (!userId) {
        console.log('[AffiliateLayout] No userId yet, waiting...');
        return;
      }

      console.log('[AffiliateLayout] Fetching affiliate for user:', userId);
      setDataLoading(true);

      try {
        const { data: affiliate, error } = await supabase
          .from('affiliates')
          .select('id, username, parent_affiliate_id, demo_credits_remaining, affiliate_plan_id')
          .eq('user_id', userId)
          .maybeSingle();

        console.log('[AffiliateLayout] Affiliate data:', affiliate, 'Error:', error);

        if (error) {
          console.error('[AffiliateLayout] Error fetching affiliate:', error);
          setDataLoading(false);
          return;
        }

        if (affiliate) {
          setAffiliateData({
            ...affiliate,
            demo_credits_remaining: affiliate.demo_credits_remaining ?? null,
            affiliate_plan_id: affiliate.affiliate_plan_id ?? null,
          });

          // Fetch plan code
          if (affiliate.affiliate_plan_id) {
            const { data: plan } = await supabase
              .from('affiliate_plans')
              .select('code')
              .eq('id', affiliate.affiliate_plan_id)
              .maybeSingle();
            setPlanCode(plan?.code || null);
          }

          // Fetch sponsor if exists
          if (affiliate.parent_affiliate_id) {
            const { data: sponsor, error: sponsorError } = await supabase
              .from('affiliates')
              .select('username')
              .eq('id', affiliate.parent_affiliate_id)
              .maybeSingle();

            console.log('[AffiliateLayout] Sponsor:', sponsor?.username, 'Error:', sponsorError);
            setSponsorName(sponsor?.username || null);
          }
        }
      } catch (err) {
        console.error('[AffiliateLayout] Unexpected error:', err);
      } finally {
        setDataLoading(false);
      }
    };

    fetchAffiliateData();
  }, [userId, currentAffiliate, isImpersonating]);

  // Build referral URL
  const replicatedUrl = affiliateData?.username
    ? `https://tryeverlaunch.com/${affiliateData.username}`
    : null;

  const copyReplicatedUrl = () => {
    if (replicatedUrl) {
      navigator.clipboard.writeText(replicatedUrl);
      toast.success('Referral link copied!', { description: replicatedUrl });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success('Logged out successfully');
    navigate('/auth');
  };

  if (isLoading || affiliateLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Super admins can access everything without impersonation
  const canAccess = role === 'affiliate' || role === 'super_admin' || role === 'admin';

  if (!canAccess) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <>
      <ImpersonationBanner />
      <div className={cn("flex h-screen overflow-hidden bg-background", isImpersonating && "pt-10")}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-sidebar transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-sidebar-border">
            <Link to="/affiliate" className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">E</span>
              </div>
              <span className="text-xl font-semibold text-sidebar-foreground">EverLaunch</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Replicated URL Card */}
          {replicatedUrl && (
            <div className="px-3 py-3 border-b border-sidebar-border">
              <div className="text-xs text-sidebar-foreground/60 mb-2">Your Replicated Site</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 text-xs text-sidebar-foreground font-medium truncate">
                  {replicatedUrl.replace('https://', '')}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  onClick={copyReplicatedUrl}
                  title="Copy URL"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  onClick={() => window.open(replicatedUrl, '_blank')}
                  title="Open in new tab"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <ul className="space-y-1">
              {affiliateNavigation.map((item) => {
                const isActive = location.pathname === item.href ||
                  (item.href !== '/affiliate' && location.pathname.startsWith(item.href));
                const showBadge = item.hasBadge && abandonmentCount > 0;
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="flex-1">{item.name}</span>
                      {showBadge && (
                        <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                          {abandonmentCount > 99 ? '99+' : abandonmentCount}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User section */}
          <div className="border-t border-sidebar-border p-4">
            {/* Demo Credits Badge - clickable */}
            <Link 
              to="/affiliate/billing"
              className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium text-sidebar-foreground">
                {planCode === 'agency' ? 'Unlimited' : (affiliateData?.demo_credits_remaining ?? 0)} credits
              </span>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-sidebar-accent transition-colors">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground text-sm font-medium">
                      {affiliateData?.username?.charAt(0).toUpperCase() || 'AF'}
                    </span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-sidebar-foreground">
                      {affiliateData?.username || 'Affiliate'}
                    </p>
                    <p className="text-xs text-sidebar-foreground/60">Partner</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-sidebar-foreground/60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => navigate('/affiliate/settings')}>
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/affiliate/settings')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="w-64 pl-9 bg-secondary border-0"
              />
            </div>
          </div>

          {/* RIGHT SIDE OF HEADER */}
          <div className="flex items-center gap-3">
            {/* Notification Bell Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                    2
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 bg-popover">
                <div className="px-3 py-2 border-b border-border">
                  <p className="font-semibold text-sm">Notifications</p>
                </div>
                <DropdownMenuItem className="flex flex-col items-start p-3 cursor-pointer">
                  <p className="font-medium text-sm">Complete Your Profile</p>
                  <p className="text-xs text-muted-foreground">Add your payment info to start earning commissions</p>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start p-3 cursor-pointer">
                  <p className="font-medium text-sm">New Training Available</p>
                  <p className="text-xs text-muted-foreground">Check out the latest sales techniques in How-To</p>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="justify-center text-sm text-primary cursor-pointer"
                  onClick={() => navigate('/affiliate/settings')}
                >
                  View All Notifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Separator */}
            <div className="hidden sm:block h-6 w-px bg-border" />

            {/* Sponsor Name */}
            <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
              <span>Sponsor:</span>
              <span className="font-medium text-foreground">
                {dataLoading ? '...' : (sponsorName || 'EverLaunch')}
              </span>
            </div>

            {/* Copy Referral Link Button */}
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex items-center gap-2"
              onClick={copyReplicatedUrl}
              disabled={!replicatedUrl || dataLoading}
            >
              <Copy className="h-3.5 w-3.5" />
              <span className="text-xs">Copy Link</span>
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children ?? <Outlet />}
        </main>
      </div>

      {/* Support Chat Widget */}
      <SupportChatWidget userRole="affiliate" />
    </div>
    </>
  );
}
