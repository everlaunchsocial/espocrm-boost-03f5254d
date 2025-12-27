import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trophy, XCircle } from 'lucide-react';

interface ClosedLeadModalProps {
  open: boolean;
  type: 'won' | 'lost';
  onClose: () => void;
  onConfirm: (notes?: string, lostReason?: string) => void;
}

const LOST_REASONS = [
  { value: 'price', label: 'Price too high' },
  { value: 'timing', label: 'Bad timing' },
  { value: 'competitor', label: 'Chose competitor' },
  { value: 'no_budget', label: 'No budget' },
  { value: 'no_need', label: 'No longer needs solution' },
  { value: 'unresponsive', label: 'Stopped responding' },
  { value: 'not_qualified', label: 'Not qualified' },
  { value: 'other', label: 'Other' },
];

export function ClosedLeadModal({ open, type, onClose, onConfirm }: ClosedLeadModalProps) {
  const [notes, setNotes] = useState('');
  const [lostReason, setLostReason] = useState('');

  const handleConfirm = () => {
    onConfirm(notes || undefined, type === 'lost' ? lostReason : undefined);
    setNotes('');
    setLostReason('');
  };

  const isWon = type === 'won';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {isWon ? (
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-green-600" />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-gray-500" />
              </div>
            )}
            <div>
              <DialogTitle>
                {isWon ? 'Congratulations! 🎉' : 'Mark as Lost'}
              </DialogTitle>
              <DialogDescription>
                {isWon
                  ? 'Great job closing this deal!'
                  : 'Help us understand why this lead was lost.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!isWon && (
            <div className="space-y-2">
              <Label htmlFor="lostReason">Reason for loss *</Label>
              <Select value={lostReason} onValueChange={setLostReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {LOST_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">
              {isWon ? 'Notes (optional)' : 'Additional details (optional)'}
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isWon
                  ? 'Any notes about the deal...'
                  : 'What happened? Any lessons learned?'
              }
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isWon && !lostReason}
            variant={isWon ? 'default' : 'secondary'}
          >
            {isWon ? 'Mark as Won' : 'Mark as Lost'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
