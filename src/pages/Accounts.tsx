import { useState } from 'react';
import { useAccounts, useAddAccount, useUpdateAccount, useDeleteAccount } from '@/hooks/useCRMData';
import { DataTable } from '@/components/crm/DataTable';
import { StatusBadge } from '@/components/crm/StatusBadge';
import { EntityForm } from '@/components/crm/EntityForm';
import { Button } from '@/components/ui/button';
import { Plus, MoreHorizontal, Pencil, Trash2, Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Account } from '@/types/crm';
import { toast } from 'sonner';

const accountFields = [
  { name: 'name', label: 'Company Name', type: 'text' as const, required: true },
  { name: 'website', label: 'Website', type: 'text' as const },
  { name: 'industry', label: 'Industry', type: 'text' as const },
  { name: 'phone', label: 'Phone', type: 'tel' as const },
  { name: 'email', label: 'Email', type: 'email' as const },
  { name: 'address', label: 'Address', type: 'text' as const },
  { name: 'city', label: 'City', type: 'text' as const },
  { name: 'country', label: 'Country', type: 'text' as const },
  { name: 'type', label: 'Type', type: 'select' as const, required: true, options: [
    { value: 'prospect', label: 'Prospect' },
    { value: 'customer', label: 'Customer' },
    { value: 'partner', label: 'Partner' },
  ]},
];

export default function Accounts() {
  const { data: accounts = [], isLoading } = useAccounts();
  const addAccount = useAddAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();

  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  const columns = [
    {
      key: 'name',
      label: 'Company',
      render: (account: Account) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center">
            <span className="text-sm font-semibold text-secondary-foreground">
              {account.name.substring(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium text-foreground">{account.name}</p>
            <p className="text-sm text-muted-foreground">{account.industry || 'No industry'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'website',
      label: 'Website',
      render: (account: Account) => {
        if (!account.website) return '-';
        try {
          return (
            <a href={account.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
              <Globe className="h-3 w-3" />
              {new URL(account.website).hostname}
            </a>
          );
        } catch {
          return account.website;
        }
      },
    },
    { key: 'phone', label: 'Phone', render: (a: Account) => a.phone || '-' },
    {
      key: 'location',
      label: 'Location',
      render: (account: Account) => account.city && account.country ? `${account.city}, ${account.country}` : '-',
    },
    {
      key: 'type',
      label: 'Type',
      render: (account: Account) => <StatusBadge status={account.type} />,
    },
    {
      key: 'actions',
      label: '',
      render: (account: Account) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(account)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDelete(account.id)} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const handleCreate = () => {
    setEditingAccount(null);
    setFormValues({ type: 'prospect' });
    setFormOpen(true);
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setFormValues({
      name: account.name,
      website: account.website || '',
      industry: account.industry || '',
      phone: account.phone || '',
      email: account.email || '',
      address: account.address || '',
      city: account.city || '',
      country: account.country || '',
      type: account.type,
    });
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteAccount.mutateAsync(id);
    toast.success('Account deleted successfully');
  };

  const handleSubmit = async () => {
    if (editingAccount) {
      await updateAccount.mutateAsync({ id: editingAccount.id, account: formValues });
      toast.success('Account updated successfully');
    } else {
      await addAccount.mutateAsync(formValues as any);
      toast.success('Account created successfully');
    }
    setFormOpen(false);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading accounts...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Accounts</h1>
          <p className="text-muted-foreground mt-1">Manage your business accounts and companies</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </Button>
      </div>

      <DataTable
        data={accounts}
        columns={columns}
        searchPlaceholder="Search accounts..."
        searchKeys={['name', 'industry']}
      />

      <EntityForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingAccount ? 'Edit Account' : 'New Account'}
        fields={accountFields}
        values={formValues}
        onChange={(name, value) => setFormValues((prev) => ({ ...prev, [name]: value }))}
        onSubmit={handleSubmit}
        submitLabel={editingAccount ? 'Update' : 'Create'}
      />
    </div>
  );
}
