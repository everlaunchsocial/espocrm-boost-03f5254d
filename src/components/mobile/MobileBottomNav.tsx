import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, CheckSquare, MoreHorizontal, Plus, Mic, Phone, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useDeviceType } from '@/hooks/useMobileOptimization';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: Home, label: 'Home', path: '/crm' },
  { icon: Users, label: 'Leads', path: '/leads' },
  { icon: CheckSquare, label: 'Tasks', path: '/tasks' },
  { icon: MoreHorizontal, label: 'More', path: '/more' },
];

interface MobileBottomNavProps {
  onQuickAction?: (action: string) => void;
}

export function MobileBottomNav({ onQuickAction }: MobileBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile } = useDeviceType();

  if (!isMobile) return null;

  const isActive = (path: string) => {
    if (path === '/crm') {
      return location.pathname === '/crm' || location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border safe-area-pb">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.slice(0, 2).map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors",
              isActive(item.path) 
                ? "text-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}

        {/* Floating Action Button */}
        <div className="relative flex-1 flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                className="h-12 w-12 rounded-full shadow-lg -mt-4 bg-primary hover:bg-primary/90"
              >
                <Plus className="h-6 w-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-48 mb-2">
              <DropdownMenuItem onClick={() => onQuickAction?.('add_lead')}>
                <Users className="h-4 w-4 mr-2" />
                Add Lead
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onQuickAction?.('log_call')}>
                <Phone className="h-4 w-4 mr-2" />
                Log Call
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onQuickAction?.('add_note')}>
                <FileText className="h-4 w-4 mr-2" />
                Add Note
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onQuickAction?.('voice_command')}>
                <Mic className="h-4 w-4 mr-2" />
                Voice Command
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {navItems.slice(2).map((item) => (
          <button
            key={item.path}
            onClick={() => item.path === '/more' ? null : navigate(item.path)}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors",
              isActive(item.path) 
                ? "text-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.path === '/more' ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex flex-col items-center gap-0.5">
                  <item.icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 mb-2">
                  <DropdownMenuItem onClick={() => navigate('/demos')}>
                    Demos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/documents')}>
                    Documents
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/reports')}>
                    Reports
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    Settings
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
