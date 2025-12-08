import { Button } from '@/components/ui/button';
import { ShieldX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <ShieldX className="mx-auto h-16 w-16 text-destructive mb-6" />
        <h1 className="text-3xl font-bold tracking-tight mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6">
          You don't have permission to access this page. Please contact your administrator if you believe this is an error.
        </p>
        <Button onClick={() => navigate('/')}>
          Go to Home
        </Button>
      </div>
    </div>
  );
}
