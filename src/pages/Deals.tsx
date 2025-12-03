import { useState } from 'react';
import { useCRMStore } from '@/stores/crmStore';
import { DataTable } from '@/components/crm/DataTable';
import { StatusBadge } from '@/components/crm/StatusBadge';
import { EntityForm } from '@/components/crm/EntityForm';
import { Button } from '@/components/ui/button';
import { Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Deal } from '@/types/crm';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function Deals() {
  const { deals, accounts, contacts, addDeal, updateDeal, deleteDeal } = useCRMStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  const dealFields = [
    { name: 'name', label: 'Deal Name', type: 'text' as const, required: true },
    { name: 'accountId', label: 'Account', type: 'select' as const, options: accounts.map(a => ({ value: a.id, label: a.name })) },
    { name: 'contactId', label: 'Contact', type: 'select' as const, options: contacts.map(c => ({ value: c.id, label: `${c.firstName} ${c.lastName}` })) },
    { name: 'amount', label: 'Amount ($)', type: 'number' as const, required: true },
    { name: 'stage', label: 'Stage', type: 'select' as const, required: true, options: [
      { value: 'prospecting', label: 'Prospecting' },
      { value: 'qualification', label: 'Qualification' },
      { value: 'proposal', label: 'Proposal' },
      { value: 'negotiation', label: 'Negotiation' },
      { value: 'closed-won', label: 'Closed Won' },
      { value: 'closed-lost', label: 'Closed Lost' },
    ]},
    { name: 'probability', label: 'Probability (%)', type: 'number' as const },
    { name: 'expectedCloseDate', label: 'Expected Close Date', type: 'date' as const },
  ];

  const columns = [
    {
      key: 'name',
      label: 'Deal',
      render: (deal: Deal) => (
        <div>
          <p className="font-medium text-foreground">{deal.name}</p>
          <p className="text-sm text-muted-foreground">{deal.accountName || 'No account'}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (deal: Deal) => (
        <span className="font-semibold text-foreground">${deal.amount.toLocaleString()}</span>
      ),
    },
    {
      key: 'stage',
      label: 'Stage',
      render: (deal: Deal) => <StatusBadge status={deal.stage} />,
    },
    {
      key: 'probability',
      label: 'Probability',
      render: (deal: Deal) => (
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${deal.probability}%` }}
            />
          </div>
          <span className="text-sm text-muted-foreground">{deal.probability}%</span>
        </div>
      ),
    },
    {
      key: 'expectedCloseDate',
      label: 'Close Date',
      render: (deal: Deal) => deal.expectedCloseDate ? format(new Date(deal.expectedCloseDate), 'MMM d, yyyy') : '-',
    },
    {
      key: 'actions',
      label: '',
      render: (deal: Deal) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(deal)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDelete(deal.id)} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const handleCreate = () => {
    setEditingDeal(null);
    setFormValues({ stage: 'prospecting', probability: 10, amount: 0 });
    setFormOpen(true);
  };

  const handleEdit = (deal: Deal) => {
    setEditingDeal(deal);
    setFormValues({
      name: deal.name,
      accountId: deal.accountId || '',
      contactId: deal.contactId || '',
      amount: deal.amount,
      stage: deal.stage,
      probability: deal.probability,
      expectedCloseDate: deal.expectedCloseDate ? format(new Date(deal.expectedCloseDate), 'yyyy-MM-dd') : '',
    });
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteDeal(id);
    toast.success('Deal deleted successfully');
  };

  const handleSubmit = () => {
    const account = accounts.find(a => a.id === formValues.accountId);
    const contact = contacts.find(c => c.id === formValues.contactId);
    
    const dealData = {
      ...formValues,
      amount: Number(formValues.amount),
      probability: Number(formValues.probability) || 0,
      accountName: account?.name,
      contactName: contact ? `${contact.firstName} ${contact.lastName}` : undefined,
      expectedCloseDate: formValues.expectedCloseDate ? new Date(formValues.expectedCloseDate) : undefined,
    };

    if (editingDeal) {
      updateDeal(editingDeal.id, dealData);
      toast.success('Deal updated successfully');
    } else {
      addDeal(dealData as any);
      toast.success('Deal created successfully');
    }
    setFormOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Deals</h1>
          <p className="text-muted-foreground mt-1">Manage your sales pipeline and opportunities</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Deal
        </Button>
      </div>

      <DataTable
        data={deals}
        columns={columns}
        searchPlaceholder="Search deals..."
        searchKeys={['name', 'accountName']}
      />

      <EntityForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingDeal ? 'Edit Deal' : 'New Deal'}
        fields={dealFields}
        values={formValues}
        onChange={(name, value) => setFormValues((prev) => ({ ...prev, [name]: value }))}
        onSubmit={handleSubmit}
        submitLabel={editingDeal ? 'Update' : 'Create'}
      />
    </div>
  );
}
