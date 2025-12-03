import { useState } from 'react';
import { useCRMStore } from '@/stores/crmStore';
import { DataTable } from '@/components/crm/DataTable';
import { StatusBadge } from '@/components/crm/StatusBadge';
import { EntityForm } from '@/components/crm/EntityForm';
import { ContactDetail } from '@/components/crm/ContactDetail';
import { Button } from '@/components/ui/button';
import { Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Contact } from '@/types/crm';
import { toast } from 'sonner';

const contactFields = [
  { name: 'firstName', label: 'First Name', type: 'text' as const, required: true },
  { name: 'lastName', label: 'Last Name', type: 'text' as const, required: true },
  { name: 'email', label: 'Email', type: 'email' as const, required: true },
  { name: 'phone', label: 'Phone', type: 'tel' as const, required: true },
  { name: 'title', label: 'Title', type: 'text' as const },
  { name: 'status', label: 'Status', type: 'select' as const, required: true, options: [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ]},
];

export default function Contacts() {
  const { contacts, accounts, addContact, updateContact, deleteContact } = useCRMStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (contact: Contact) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {contact.firstName[0]}{contact.lastName[0]}
            </span>
          </div>
          <div>
            <p className="font-medium text-foreground">{contact.firstName} {contact.lastName}</p>
            <p className="text-sm text-muted-foreground">{contact.title || 'No title'}</p>
          </div>
        </div>
      ),
    },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'accountName', label: 'Account', render: (c: Contact) => c.accountName || '-' },
    {
      key: 'status',
      label: 'Status',
      render: (contact: Contact) => <StatusBadge status={contact.status} />,
    },
    {
      key: 'actions',
      label: '',
      render: (contact: Contact) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(contact)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDelete(contact.id)} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const handleCreate = () => {
    setEditingContact(null);
    setFormValues({ status: 'active' });
    setFormOpen(true);
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormValues({
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      title: contact.title || '',
      status: contact.status,
    });
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteContact(id);
    toast.success('Contact deleted successfully');
  };

  const handleSubmit = () => {
    if (editingContact) {
      updateContact(editingContact.id, formValues);
      toast.success('Contact updated successfully');
    } else {
      addContact(formValues as any);
      toast.success('Contact created successfully');
    }
    setFormOpen(false);
  };

  const handleRowClick = (contact: Contact) => {
    setSelectedContact(contact);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Contacts</h1>
          <p className="text-muted-foreground mt-1">Manage your contacts and relationships</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      <DataTable
        data={contacts}
        columns={columns}
        searchPlaceholder="Search contacts..."
        searchKeys={['firstName', 'lastName', 'email']}
        onRowClick={handleRowClick}
      />

      <ContactDetail
        contact={selectedContact}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />

      <EntityForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingContact ? 'Edit Contact' : 'New Contact'}
        fields={contactFields}
        values={formValues}
        onChange={(name, value) => setFormValues((prev) => ({ ...prev, [name]: value }))}
        onSubmit={handleSubmit}
        submitLabel={editingContact ? 'Update' : 'Create'}
      />
    </div>
  );
}
