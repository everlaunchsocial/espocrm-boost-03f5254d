import { useLocation, useNavigate } from 'react-router-dom';
import { useDualRoleAccess } from '@/hooks/useDualRoleAccess';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowLeftRight, Shield, User, Check } from 'lucide-react';

export function PortalSwitcher() {
  const { isDualRole, hasAdminAccess, hasAffiliateAccess, isLoading, affiliateUsername } = useDualRoleAccess();
  const location = useLocation();
  const navigate = useNavigate();

  // Don't render if user doesn't have dual access or still loading
  if (isLoading || !isDualRole) {
    return null;
  }

  const isInAdminPortal = location.pathname.startsWith('/admin') || 
    location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/calendar') ||
    location.pathname.startsWith('/email') ||
    location.pathname.startsWith('/contacts') ||
    location.pathname.startsWith('/accounts') ||
    location.pathname.startsWith('/leads') ||
    location.pathname.startsWith('/deals') ||
    location.pathname.startsWith('/tasks');

  const isInAffiliatePortal = location.pathname.startsWith('/affiliate');

  const currentPortal = isInAffiliatePortal ? 'affiliate' : 'admin';

  const handleSwitchPortal = (portal: 'admin' | 'affiliate') => {
    if (portal === 'admin' && !isInAdminPortal) {
      navigate('/dashboard');
    } else if (portal === 'affiliate' && !isInAffiliatePortal) {
      navigate('/affiliate');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 text-xs"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            {currentPortal === 'admin' ? 'Admin Portal' : 'Affiliate Portal'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem 
          onClick={() => handleSwitchPortal('admin')}
          className="gap-2"
        >
          <Shield className="h-4 w-4" />
          <span>Admin Portal</span>
          {currentPortal === 'admin' && <Check className="h-4 w-4 ml-auto" />}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleSwitchPortal('affiliate')}
          className="gap-2"
        >
          <User className="h-4 w-4" />
          <span>Affiliate Portal</span>
          {affiliateUsername && (
            <span className="text-muted-foreground text-xs ml-1">
              ({affiliateUsername})
            </span>
          )}
          {currentPortal === 'affiliate' && <Check className="h-4 w-4 ml-auto" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
