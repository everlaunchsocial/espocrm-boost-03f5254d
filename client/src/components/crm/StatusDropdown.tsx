import { useState } from 'react';
import { ContactStatus } from '@/types/crm';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, ChevronDown, Search, X } from 'lucide-react';

const contactStatuses: { value: ContactStatus; label: string; color: string }[] = [
  { value: 'client', label: 'Client', color: 'bg-success/10 text-success border-success/20' },
  { value: 'lead', label: 'Lead', color: 'bg-primary/10 text-primary border-primary/20' },
  { value: 'not-interested', label: 'Not Interested', color: 'bg-muted text-muted-foreground border-muted' },
  { value: 'left-voicemail', label: 'Left Voicemail', color: 'bg-warning/10 text-warning border-warning/20' },
  { value: 'sent-email', label: 'Sent Email', color: 'bg-chart-4/10 text-chart-4 border-chart-4/20' },
  { value: 'contact-later', label: 'Contact Later', color: 'bg-warning/10 text-warning border-warning/20' },
  { value: 'contacted', label: 'Contacted', color: 'bg-success/10 text-success border-success/20' },
  { value: 'appointment-set', label: 'Appointment Set', color: 'bg-chart-4/10 text-chart-4 border-chart-4/20' },
];

interface StatusDropdownProps {
  value: ContactStatus;
  onChange: (status: ContactStatus) => void;
  className?: string;
}

export function StatusDropdown({ value, onChange, className }: StatusDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [pendingStatus, setPendingStatus] = useState<ContactStatus | null>(null);

  const currentStatus = contactStatuses.find((s) => s.value === value);
  const filteredStatuses = contactStatuses.filter((s) =>
    s.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (status: ContactStatus) => {
    setPendingStatus(status);
  };

  const handleConfirm = () => {
    if (pendingStatus) {
      onChange(pendingStatus);
      setPendingStatus(null);
    }
    setOpen(false);
    setSearch('');
  };

  const handleCancel = () => {
    setPendingStatus(null);
    setOpen(false);
    setSearch('');
  };

  const selectedStatus = pendingStatus || value;
  const selectedStatusData = contactStatuses.find((s) => s.value === selectedStatus);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'justify-between font-normal',
            currentStatus?.color,
            className
          )}
        >
          {currentStatus?.label || 'Select status...'}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0 bg-popover border border-border" align="start">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>
        
        <div className="max-h-60 overflow-y-auto p-1">
          {filteredStatuses.map((status) => (
            <button
              key={status.value}
              onClick={() => handleSelect(status.value)}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md transition-colors',
                'hover:bg-muted',
                selectedStatus === status.value && 'bg-muted'
              )}
            >
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium flex-1 justify-center',
                  status.color
                )}
              >
                {status.label}
              </span>
              {selectedStatus === status.value && (
                <Check className="h-4 w-4 text-success flex-shrink-0" />
              )}
            </button>
          ))}
          {filteredStatuses.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No status found.
            </p>
          )}
        </div>

        {pendingStatus && pendingStatus !== value && (
          <div className="flex items-center justify-end gap-2 p-2 border-t border-border bg-muted/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-8 px-2"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleConfirm}
              className="h-8 px-2"
            >
              <Check className="h-4 w-4" />
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
