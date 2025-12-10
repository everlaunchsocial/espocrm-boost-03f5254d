import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserRole } from '@/hooks/useUserRole';

export function ImpersonationBanner() {
  const navigate = useNavigate();
  const { role } = useUserRole();
  const [impersonatingUsername, setImpersonatingUsername] = useState<string | null>(null);

  useEffect(() => {
    const username = localStorage.getItem('impersonating_affiliate_username');
    setImpersonatingUsername(username);

    // Listen for storage changes (in case it's cleared elsewhere)
    const handleStorageChange = () => {
      setImpersonatingUsername(localStorage.getItem('impersonating_affiliate_username'));
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Only show banner if impersonating AND user is super_admin
  if (!impersonatingUsername || role !== 'super_admin') {
    return null;
  }

  const handleExitView = () => {
    localStorage.removeItem('impersonating_affiliate_id');
    localStorage.removeItem('impersonating_affiliate_username');
    setImpersonatingUsername(null);
    navigate('/admin/affiliates');
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-orange-500 text-white py-2 px-4 flex items-center justify-center gap-4 shadow-lg">
      <span className="font-medium">
        Viewing as: <strong>{impersonatingUsername}</strong>
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleExitView}
        className="text-white hover:bg-orange-600 hover:text-white gap-1"
      >
        <X className="h-4 w-4" />
        Exit View
      </Button>
    </div>
  );
}
