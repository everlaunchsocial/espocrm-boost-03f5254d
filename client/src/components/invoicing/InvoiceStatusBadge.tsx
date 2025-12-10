import { Badge } from '@/components/ui/badge';

interface InvoiceStatusBadgeProps {
  status: string;
  dueDate?: Date;
}

export const InvoiceStatusBadge = ({ status, dueDate }: InvoiceStatusBadgeProps) => {
  const isOverdue = dueDate && new Date(dueDate) < new Date() && status !== 'paid';
  
  if (isOverdue && status !== 'paid') {
    return <Badge variant="destructive">Overdue</Badge>;
  }

  const variants: Record<string, { className: string; label: string }> = {
    draft: { className: 'bg-gray-500 text-white', label: 'Draft' },
    sent: { className: 'bg-blue-500 text-white', label: 'Active' },
    partial: { className: 'bg-yellow-500 text-white', label: 'Partial' },
    paid: { className: 'bg-green-500 text-white', label: 'Paid' },
    overdue: { className: 'bg-red-500 text-white', label: 'Overdue' },
  };

  const config = variants[status] || variants.draft;

  return <Badge className={config.className}>{config.label}</Badge>;
};
