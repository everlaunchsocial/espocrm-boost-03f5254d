import { PhoneCall } from 'lucide-react';

export default function AdminEvertrak() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <PhoneCall className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-foreground">Evertrak</h1>
      </div>
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">Phone number tracking (like CallRail) coming soon...</p>
      </div>
    </div>
  );
}
