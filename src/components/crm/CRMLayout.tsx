import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Building2,
  UserPlus,
  Handshake,
  CheckSquare,
  Mail,
  Search,
  Bell,
  Menu,
  X,
  ChevronDown,
  FolderOpen,
  FileText,
  Receipt,
  Sparkles,
  Presentation,
  CalendarDays,
  DollarSign,
  BarChart3,
  Phone,
  Network,
  Percent,
  Settings,
  User,
  LogOut,
  GraduationCap,
  Video,
  Lightbulb,
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
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface CRMLayoutProps {
  children?: ReactNode;
}
const crmNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Calendar', href: '/calendar', icon: CalendarDays },
  { name: 'Email', href: '/email', icon: Mail },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Accounts', href: '/accounts', icon: Building2 },
  { name: 'Leads', href: '/leads', icon: UserPlus },
  { name: 'AI Demos', href: '/demos', icon: Presentation },
  { name: 'Deals', href: '/deals', icon: Handshake },
  { name: 'Estimates', href: '/estimates', icon: FileText },
  { name: 'Invoices', href: '/invoices', icon: Receipt },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Media Library', href: '/media-library', icon: FolderOpen },
  { name: 'Voice Demo', href: '/voice-demo', icon: Sparkles },
];

const adminNavigation = [
  { name: 'Affiliates', href: '/admin/affiliates', icon: Users },
  { name: 'Affiliate Videos', href: '/admin/affiliate-videos', icon: Video },
  { name: 'Payouts', href: '/admin/payouts', icon: DollarSign },
  { name: 'Customer Usage', href: '/admin/customer-usage', icon: BarChart3 },
  { name: 'AI Usage & Costs', href: '/admin/usage', icon: DollarSign },
  { name: 'Expenses', href: '/admin/expenses', icon: Receipt },
  { name: 'Quality Insights', href: '/admin/quality-insights', icon: Phone },
  { name: 'Signup Analytics', href: '/admin/signup-analytics', icon: UserPlus },
  { name: 'Training', href: '/admin/training', icon: GraduationCap },
  { name: 'Comp Plans', href: '/admin/comp-plans', icon: Percent },
  { name: 'Genealogy', href: '/admin/genealogy', icon: Network, superAdminOnly: true },
  { name: 'Feature Backlog', href: '/admin/backlog', icon: Lightbulb, superAdminOnly: true },
  { name: 'Testing', href: '/admin/testing', icon: ClipboardCheck, superAdminOnly: true },
];

const customerNavigation = [
  { name: 'My Usage', href: '/customer/usage', icon: Phone },
];

export function CRMLayout({ children }: CRMLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { role, isLoading, isAdmin, userId } = useUserRole();
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');

  // Auth and role-based redirect
  useEffect(() => {
    if (isLoading) return;
    
    // If not authenticated, redirect to /auth
    if (!userId) {
      navigate('/auth', { replace: true });
      return;
    }
    
    // Role-based redirect: customers and affiliates should not access CRM
    if (role === 'customer') {
      navigate('/customer', { replace: true });
    } else if (role === 'affiliate') {
      navigate('/affiliate', { replace: true });
    }
  }, [role, isLoading, userId, navigate]);

  // Fetch user details
  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || '');
        setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'User');
      }
    }
    fetchUser();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const getRoleLabel = () => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'affiliate': return 'Affiliate';
      default: return 'Customer';
    }
  };

  const getInitials = () => {
    if (userName) {
      const parts = userName.split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return userName.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  // Filter admin navigation based on role
  const filteredAdminNav = adminNavigation.filter(item => {
    if (item.superAdminOnly && role !== 'super_admin') return false;
    return true;
  });

  // Show loading state while auth is being determined
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
            <Link to="/" className="flex items-center gap-3">
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

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            {/* CRM Navigation */}
            <ul className="space-y-1">
              {crmNavigation.map((item) => {
                const isActive = location.pathname === item.href;
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

            {/* Admin Section */}
            {isAdmin && (
              <>
                <div className="mt-6 mb-2 px-3">
                  <span className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                    Admin
                  </span>
                </div>
                <ul className="space-y-1">
                  {filteredAdminNav.map((item) => {
                    const isActive = location.pathname === item.href;
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
              </>
            )}

            {/* Customer Section */}
            {role === 'customer' && (
              <>
                <div className="mt-6 mb-2 px-3">
                  <span className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                    My Account
                  </span>
                </div>
                <ul className="space-y-1">
                  {customerNavigation.map((item) => {
                    const isActive = location.pathname === item.href;
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
              </>
            )}
          </nav>

          {/* User section */}
          <div className="border-t border-sidebar-border p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-sidebar-accent transition-colors">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground text-sm font-medium">{getInitials()}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-sidebar-foreground">{userName}</p>
                    <p className="text-xs text-sidebar-foreground/60">{getRoleLabel()}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-sidebar-foreground/60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => navigate('/admin/profile')}>
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate('/admin/settings')}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                )}
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
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                3
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
