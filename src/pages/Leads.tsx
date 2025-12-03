import { useState } from 'react';
import { useLeads, useAddLead, useUpdateLead, useDeleteLead, useConvertLeadToContact } from '@/hooks/useCRMData';
import { DataTable } from '@/components/crm/DataTable';
import { StatusBadge } from '@/components/crm/StatusBadge';
import { EntityForm } from '@/components/crm/EntityForm';
import { LeadDetail } from '@/components/crm/LeadDetail';
import { Button } from '@/components/ui/button';
import { Plus, MoreHorizontal, Pencil, Trash2, UserCheck } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Lead } from '@/types/crm';
import { toast } from 'sonner';

const leadFields = [
  { name: 'firstName', label: 'First Name', type: 'text' as const, required: true },
  { name: 'lastName', label: 'Last Name', type: 'text' as const, required: true },
  { name: 'email', label: 'Email', type: 'email' as const, required: true },
  { name: 'phone', label: 'Phone', type: 'tel' as const },
  { name: 'company', label: 'Company', type: 'text' as const },
  { name: 'title', label: 'Title', type: 'text' as const },
  { name: 'source', label: 'Source', type: 'select' as const, required: true, options: [
    { value: 'web', label: 'Website' },
    { value: 'referral', label: 'Referral' },
    { value: 'campaign', label: 'Campaign' },
    { value: 'social', label: 'Social Media' },
    { value: 'other', label: 'Other' },
  ]},
  { name: 'status', label: 'Status', type: 'select' as const, required: true, options: [
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'unqualified', label: 'Unqualified' },
  ]},
];

export default function Leads() {
  const { data: leads = [], isLoading } = useLeads();
  const addLead = useAddLead();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const convertLeadToContact = useConvertLeadToContact();

  const [formOpen, setFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (lead: Lead) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-chart-4/10 flex items-center justify-center">
            <span className="text-sm font-medium text-chart-4">
              {lead.firstName[0]}{lead.lastName[0]}
            </span>
          </div>
          <div>
            <p className="font-medium text-foreground">{lead.firstName} {lead.lastName}</p>
            <p className="text-sm text-muted-foreground">{lead.company || 'No company'}</p>
          </div>
        </div>
      ),
    },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone', render: (l: Lead) => l.phone || '-' },
    {
      key: 'source',
      label: 'Source',
      render: (lead: Lead) => (
        <span className="capitalize text-muted-foreground">{lead.source}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (lead: Lead) => <StatusBadge status={lead.status} />,
    },
    {
      key: 'actions',
      label: '',
      render: (lead: Lead) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(lead); }}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            {lead.status !== 'converted' && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleConvert(lead); }}>
                <UserCheck className="h-4 w-4 mr-2" />
                Convert to Contact
              </DropdownMenuItem>
            )}
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); handleDelete(lead.id); }} 
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const handleRowClick = (lead: Lead) => {
    setSelectedLead(lead);
    setDetailOpen(true);
  };

  const handleCreate = () => {
    setEditingLead(null);
    setFormValues({ source: 'web', status: 'new' });
    setFormOpen(true);
  };

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead);
    setFormValues({
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone || '',
      company: lead.company || '',
      title: lead.title || '',
      source: lead.source,
      status: lead.status,
    });
    setFormOpen(true);
    setDetailOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteLead.mutateAsync(id);
    toast.success('Lead deleted successfully');
  };

  const handleConvert = async (lead: Lead) => {
    await convertLeadToContact.mutateAsync(lead);
    toast.success('Lead converted to contact successfully');
  };

  const handleSubmit = async () => {
    if (editingLead) {
      await updateLead.mutateAsync({ id: editingLead.id, lead: formValues });
      toast.success('Lead updated successfully');
    } else {
      await addLead.mutateAsync(formValues as any);
      toast.success('Lead created successfully');
    }
    setFormOpen(false);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading leads...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Leads</h1>
          <p className="text-muted-foreground mt-1">Track and convert potential customers</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </Button>
      </div>

      <DataTable
        data={leads}
        columns={columns}
        searchPlaceholder="Search leads..."
        searchKeys={['firstName', 'lastName', 'email', 'company']}
        onRowClick={handleRowClick}
      />

      <EntityForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingLead ? 'Edit Lead' : 'New Lead'}
        fields={leadFields}
        values={formValues}
        onChange={(name, value) => setFormValues((prev) => ({ ...prev, [name]: value }))}
        onSubmit={handleSubmit}
        submitLabel={editingLead ? 'Update' : 'Create'}
      />

      <LeadDetail
        lead={selectedLead}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onEdit={handleEdit}
      />
    </div>
  );
}
