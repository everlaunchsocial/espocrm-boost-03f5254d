import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRecordPayment } from '@/hooks/useInvoices';
import { Invoice } from '@/types/invoicing';
import { toast } from 'sonner';

interface RecordPaymentModalProps {
  invoice: Invoice;
  onClose: () => void;
}

export const RecordPaymentModal = ({ invoice, onClose }: RecordPaymentModalProps) => {
  const [amount, setAmount] = useState((invoice.totalAmount - invoice.amountPaid).toFixed(2));
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const recordPayment = useRecordPayment();

  const balanceDue = invoice.totalAmount - invoice.amountPaid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    
    if (paymentAmount > balanceDue) {
      toast.error('Payment amount cannot exceed balance due');
      return;
    }

    try {
      await recordPayment.mutateAsync({
        invoiceId: invoice.id,
        amount: paymentAmount,
        notes: `${paymentMethod}: ${notes}`.trim(),
      });
      toast.success('Payment recorded successfully');
      onClose();
    } catch (error: any) {
      toast.error('Failed to record payment: ' + error.message);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Invoice Total</span>
              <span>${invoice.totalAmount.toFixed(2)}</span>
            </div>
            {invoice.amountPaid > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Already Paid</span>
                <span>-${invoice.amountPaid.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Balance Due</span>
              <span>${balanceDue.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <Label htmlFor="amount">Payment Amount</Label>
            <Input
              id="amount"
              type="number"
              min="0.01"
              max={balanceDue}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="credit_card">Credit Card</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment reference, check number, etc."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={recordPayment.isPending}>
              {recordPayment.isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
