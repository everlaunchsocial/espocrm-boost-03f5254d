import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  UserPlus,
  Presentation,
  DollarSign,
  Users,
  GraduationCap,
  Settings,
  Menu,
  X,
  ChevronDown,
  Bell,
  Search,
  LogOut,
  User,
} from 'lucide-react';
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
import { getReplicatedUrl } from '@/utils/subdomainRouting';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Copy, ExternalLink } from 'lucide-react';

interface AffiliateLayoutProps {
  children?: ReactNode;
}

const affiliateNavigation = [
  { name: 'Dashboard', href: '/affiliate', icon: LayoutDashboard },
  { name: 'Leads', href: '/affiliate/leads', icon: UserPlus },
  { name: 'Demos', href: '/affiliate/demos', icon: Presentation },
  { name: 'Commissions', href: '/affiliate/commissions', icon: DollarSign },
  { name: 'Team', href: '/affiliate/team', icon: Users },
  { name: 'How-To', href: '/affiliate/training', icon: GraduationCap },
  { name: 'Settings', href: '/affiliate/settings', icon: Settings },
];

// Force rebuild - timestamp: 2025-12-09T15:30:00Z
console.log('[AffiliateLayout] === COMPONENT FILE LOADED ===');

export function AffiliateLayout({ children }: AffiliateLayoutProps) {
  console.log('[AffiliateLayout] === COMPONENT FUNCTION CALLED ===');
  
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { role, isLoading, userId } = useUserRole();
  const { affiliate, isLoading: affiliateLoading } = useCurrentAffiliate();
  const [sponsorName, setSponsorName] = useState<string | null>(null);

  console.log('[AffiliateLayout] Hook results:', { 
    role, 
    isLoading, 
    userId,
    affiliate, 
    affiliateLoading 
  });

  // Direct RPC test on mount
  useEffect(() => {
    const testDirectRpc = async () => {
      console.log('[AffiliateLayout] === DIRECT RPC TEST START ===');
      
      // Test 1: Get current session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      console.log('[AffiliateLayout] Session test:', { 
        hasSession: !!sessionData?.session,
        userId: sessionData?.session?.user?.id,
        email: sessionData?.session?.user?.email,
        sessionError 
      });
      
      // Test 2: Direct RPC call
      const { data: rpcRole, error: rpcError } = await supabase.rpc('get_my_global_role');
      console.log('[AffiliateLayout] Direct RPC get_my_global_role:', { rpcRole, rpcError });
      
      // Test 3: Direct affiliates query
      if (sessionData?.session?.user?.id) {
        const { data: affiliateData, error: affiliateError } = await supabase
          .from('affiliates')
          .select('id, username, user_id, parent_affiliate_id')
          .eq('user_id', sessionData.session.user.id)
          .maybeSingle();
        console.log('[AffiliateLayout] Direct affiliates query:', { affiliateData, affiliateError });
      }
      
      console.log('[AffiliateLayout] === DIRECT RPC TEST END ===');
    };
    
    testDirectRpc();
  }, []);

  const replicatedUrl = affiliate?.username ? getReplicatedUrl(affiliate.username) : null;
  
  console.log('[AffiliateLayout] Derived values:', { 
    replicatedUrl, 
    hasAffiliate: !!affiliate,
    username: affiliate?.username 
  });

  // Fetch sponsor information
  useEffect(() => {
    const fetchSponsor = async () => {
      console.log('[AffiliateLayout] fetchSponsor called, affiliate:', affiliate);
      
      if (!affiliate?.parent_affiliate_id) {
        console.log('[AffiliateLayout] No parent_affiliate_id, skipping sponsor fetch');
        setSponsorName(null);
        return;
      }
      
      console.log('[AffiliateLayout] Fetching sponsor for parent_id:', affiliate.parent_affiliate_id);
      
      const { data: sponsorAffiliate, error } = await supabase
        .from('affiliates')
        .select('username')
        .eq('id', affiliate.parent_affiliate_id)
        .maybeSingle();
      
      console.log('[AffiliateLayout] Sponsor query result:', { sponsorAffiliate, error });
      
      if (sponsorAffiliate) {
        setSponsorName(sponsorAffiliate.username);
      }
    };
    
    fetchSponsor();
  }, [affiliate?.id, affiliate?.parent_affiliate_id]);

  const copyReplicatedUrl = () => {
    if (replicatedUrl) {
      navigator.clipboard.writeText(replicatedUrl);
      toast.success('Replicated URL copied to clipboard!');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success('Logged out successfully');
    navigate('/auth');
  };

  // Show loading state
  console.log('[AffiliateLayout] Checking loading state:', { isLoading, role });
  
  if (isLoading) {
    console.log('[AffiliateLayout] Still loading, showing spinner');
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Redirect non-affiliates
  console.log('[AffiliateLayout] Role check:', { role, isAffiliate: role === 'affiliate' });
  
  if (role !== 'affiliate') {
    console.log('[AffiliateLayout] ❌ REDIRECTING - role is not affiliate:', role);
    if (role === 'super_admin' || role === 'admin') {
      console.log('[AffiliateLayout] Redirecting admin to /');
      return <Navigate to="/" replace />;
    }
    console.log('[AffiliateLayout] Redirecting to /unauthorized');
    return <Navigate to="/unauthorized" replace />;
  }
  
  console.log('[AffiliateLayout] ✅ ACCESS GRANTED - rendering affiliate dashboard');

  return (
    <div className="flex h-screen overflow-hidden bg-background">
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
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User section */}
          <div className="border-t border-sidebar-border p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-sidebar-accent transition-colors">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground text-sm font-medium">AF</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-sidebar-foreground">Affiliate</p>
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
          <div className="flex items-center gap-3">
            {/* Sponsor Name */}
            {sponsorName && (
              <div className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground">
                <span>Sponsor:</span>
                <span className="font-medium text-foreground">{sponsorName}</span>
              </div>
            )}
            
            {/* Referral Link */}
            {replicatedUrl && (
              <Button
                variant="outline"
                size="sm"
                className="hidden md:flex items-center gap-2"
                onClick={copyReplicatedUrl}
              >
                <Copy className="h-3.5 w-3.5" />
                <span className="text-xs">Copy Referral Link</span>
              </Button>
            )}
            
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                2
              </span>
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
