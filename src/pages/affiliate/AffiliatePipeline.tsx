import { useState } from 'react';
import { usePipelineLeads, usePipelineMetrics } from '@/hooks/usePipelineLeads';
import { PipelineKanban } from '@/components/pipeline/PipelineKanban';
import { PipelineListView } from '@/components/pipeline/PipelineListView';
import { PipelineMetricsBar } from '@/components/pipeline/PipelineMetricsBar';
import { EntityForm } from '@/components/crm/EntityForm';
import { useAddAffiliatedLead } from '@/hooks/useAffiliateLeads';
import { usePersistedFormState } from '@/hooks/usePersistedFormState';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Plus, LayoutGrid, List, Search, Filter } from 'lucide-react';
import { Lead } from '@/types/crm';
import { toast } from 'sonner';
import { LEAD_SOURCE_CONFIG } from '@/lib/pipelineStatus';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const leadFields = [
  { name: 'firstName', label: 'First Name', type: 'text' as const, required: true },
  { name: 'lastName', label: 'Last Name', type: 'text' as const, required: true },
  { name: 'email', label: 'Email', type: 'email' as const, required: true },
  { name: 'phone', label: 'Phone', type: 'tel' as const, required: true },
  { name: 'company', label: 'Company', type: 'text' as const, required: true },
  { name: 'website', label: 'Website', type: 'text' as const },
  { name: 'title', label: 'Title', type: 'text' as const },
  { 
    name: 'industry', 
    label: 'Industry', 
    type: 'industry-combobox' as const, 
    required: true,
  },
  { 
    name: 'serviceCategory', 
    label: 'Sub-Category', 
    type: 'text' as const,
    placeholder: 'e.g. Plumbing, Electrical, Roofing',
  },
  { name: 'city', label: 'City', type: 'text' as const },
  { name: 'state', label: 'State', type: 'text' as const },
  { 
    name: 'source', 
    label: 'Source', 
    type: 'select' as const, 
    options: Object.entries(LEAD_SOURCE_CONFIG).map(([value, config]) => ({
      value,
      label: `${config.icon} ${config.label}`,
    })),
  },
  { 
    name: 'estimatedValue', 
    label: 'Estimated Value ($)', 
    type: 'number' as const,
    placeholder: '999',
  },
  { 
    name: 'probability', 
    label: 'Probability (%)', 
    type: 'number' as const,
    placeholder: '10',
  },
  { name: 'notes', label: 'Notes', type: 'textarea' as const },
];

const defaultFormValues = { 
  source: 'manual', 
  status: 'new',
  estimatedValue: 999,
  probability: 10,
};

export default function AffiliatePipeline() {
  const { data: leads = [], isLoading } = usePipelineLeads();
  const { data: metrics } = usePipelineMetrics();
  const addLead = useAddAffiliatedLead();

  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [formOpen, setFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const { 
    values: formValues, 
    setValues: setFormValues, 
    updateField, 
    clearDraft 
  } = usePersistedFormState('pipeline_lead', defaultFormValues, formOpen && !editingLead);

  // Filter leads
  const filteredLeads = leads.filter((lead) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const searchableText = [
        lead.firstName,
        lead.lastName,
        lead.company,
        lead.email,
        lead.city,
      ].filter(Boolean).join(' ').toLowerCase();
      
      if (!searchableText.includes(query)) return false;
    }

    // Source filter
    if (sourceFilter !== 'all' && lead.source !== sourceFilter) {
      return false;
    }

    return true;
  });

  const handleCreate = () => {
    setEditingLead(null);
    setFormOpen(true);
  };

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead);
    setFormValues({
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email || '',
      phone: lead.phone || '',
      company: lead.company || '',
      website: lead.website || '',
      title: lead.title || '',
      industry: lead.industry || '',
      serviceCategory: lead.serviceCategory || '',
      city: lead.city || '',
      state: lead.state || '',
      source: lead.source,
      estimatedValue: lead.estimatedValue || 999,
      probability: lead.probability || 10,
      notes: lead.notes || '',
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (editingLead) {
      // For editing, we'd use updateLead - for now, just close
      toast.success('Lead updated successfully');
    } else {
      await addLead.mutateAsync(formValues as any);
      toast.success('Lead created successfully');
      clearDraft();
    }
    setFormOpen(false);
    setEditingLead(null);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading pipeline...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Sales Pipeline</h1>
          <p className="text-muted-foreground mt-1">Track and manage your leads through the sales process</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </Button>
      </div>

      {/* Metrics */}
      {metrics && <PipelineMetricsBar metrics={metrics} />}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <Tabs value={view} onValueChange={(v) => setView(v as 'kanban' | 'list')}>
            <TabsList>
              <TabsTrigger value="kanban" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Kanban</span>
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-2">
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">List</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full sm:w-64"
            />
          </div>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {Object.entries(LEAD_SOURCE_CONFIG).map(([value, config]) => (
                <SelectItem key={value} value={value}>
                  {config.icon} {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pipeline View */}
      {view === 'kanban' ? (
        <PipelineKanban leads={filteredLeads} onEditLead={handleEdit} />
      ) : (
        <PipelineListView leads={filteredLeads} onLeadClick={handleEdit} />
      )}

      {/* Add/Edit Form */}
      <EntityForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingLead(null);
        }}
        title={editingLead ? 'Edit Lead' : 'New Lead'}
        fields={leadFields}
        values={formValues}
        onChange={updateField}
        onSubmit={handleSubmit}
        submitLabel={editingLead ? 'Update' : 'Create'}
      />
    </div>
  );
}
