import { useState, useMemo } from 'react';
import { useLeads, useAddLead, useUpdateLead, useDeleteLead, useConvertLeadToContact } from '@/hooks/useCRMData';
import { usePersistedFormState } from '@/hooks/usePersistedFormState';
import { useLeadTagsMap } from '@/hooks/useLeadTagsMap';
import { useLeadsWithTags } from '@/hooks/useLeadTags';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { DataTable } from '@/components/crm/DataTable';
import { StatusBadge } from '@/components/crm/StatusBadge';
import { PipelineStatusBadge } from '@/components/crm/PipelineStatusBadge';
import { EntityForm } from '@/components/crm/EntityForm';
import { LeadDetail } from '@/components/crm/LeadDetail';
import { LeadTagFilter, TagFilterMode } from '@/components/crm/LeadTagFilter';
import { LeadTagBadges } from '@/components/crm/LeadTagBadges';
import { LeadLastSeenBadge } from '@/components/crm/LeadLastSeenBadge';
import { InlineVoiceSummaryButton } from '@/components/crm/InlineVoiceSummaryButton';
import { SmartFilters, SmartFilterType } from '@/components/crm/SmartFilters';
import { useLeadsNeedingFollowUp, useLeadsWithRecentActivity } from '@/hooks/useLeadsNeedingFollowUp';
import { Button } from '@/components/ui/button';
import { Plus, MoreHorizontal, Pencil, Trash2, UserCheck, Globe, Star, MapPin } from 'lucide-react';
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
  { name: 'website', label: 'Website', type: 'text' as const, required: true },
  { name: 'phone', label: 'Phone', type: 'tel' as const, required: true },
  { name: 'company', label: 'Company', type: 'text' as const, required: true },
  { name: 'title', label: 'Title', type: 'text' as const },
  { 
    name: 'industry', 
    label: 'Industry', 
    type: 'industry-combobox' as const, 
    required: true,
    placeholder: 'Search industries...',
  },
  { 
    name: 'serviceCategory', 
    label: 'Sub-Category (if applicable)', 
    type: 'text' as const,
    placeholder: 'e.g. Plumbing, Electrical, Roofing',
    helperText: 'Important: Specify sub-category for Home Improvement'
  },
  { name: 'address', label: 'Address', type: 'text' as const },
  { name: 'city', label: 'City', type: 'text' as const },
  { name: 'state', label: 'State', type: 'text' as const },
  { name: 'zipCode', label: 'Zip Code', type: 'text' as const },
  { name: 'facebookUrl', label: 'Facebook URL', type: 'text' as const },
  { name: 'instagramHandle', label: 'Instagram Handle', type: 'text' as const },
  { name: 'source', label: 'Source', type: 'select' as const, options: [
    { value: 'web', label: 'Website' },
    { value: 'referral', label: 'Referral' },
    { value: 'campaign', label: 'Campaign' },
    { value: 'social', label: 'Social Media' },
    { value: 'google-leads', label: 'Google Leads' },
    { value: 'other', label: 'Other' },
  ]},
  { name: 'status', label: 'Status', type: 'select' as const, options: [
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'unqualified', label: 'Unqualified' },
  ]},
];

const defaultFormValues = { source: 'web', status: 'new' };

export default function Leads() {
  const { isEnabled } = useFeatureFlags();
  const { data: leads = [], isLoading } = useLeads();
  const addLead = useAddLead();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const convertLeadToContact = useConvertLeadToContact();

  const [formOpen, setFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  
  // Tag filter state
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagFilterMode, setTagFilterMode] = useState<TagFilterMode>('any');
  
  // Smart filter state
  const [activeSmartFilters, setActiveSmartFilters] = useState<SmartFilterType[]>([]);

  // Get lead IDs for tag fetching
  const leadIds = useMemo(() => leads.map(l => l.id), [leads]);
  const { data: tagsMap = new Map() } = useLeadTagsMap(leadIds);
  
  // Get filtered lead IDs based on tags
  const { data: filteredLeadIds = [] } = useLeadsWithTags(selectedTags, tagFilterMode);
  
  // Get smart filter lead IDs
  const { data: followUpLeadIds = new Set<string>() } = useLeadsNeedingFollowUp();
  const { data: recentActivityLeadIds = new Set<string>() } = useLeadsWithRecentActivity();

  // Toggle smart filter
  const toggleSmartFilter = (filter: SmartFilterType) => {
    setActiveSmartFilters(prev =>
      prev.includes(filter)
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  // Apply all filters to leads
  const filteredLeads = useMemo(() => {
    let result = leads;
    
    // Apply tag filter
    if (selectedTags.length > 0) {
      if (tagFilterMode === 'exclude') {
        result = result.filter(lead => !filteredLeadIds.includes(lead.id));
      } else {
        result = result.filter(lead => filteredLeadIds.includes(lead.id));
      }
    }
    
    // Apply smart filters (combine with AND logic)
    if (activeSmartFilters.includes('needsFollowUp')) {
      result = result.filter(lead => followUpLeadIds.has(lead.id));
    }
    if (activeSmartFilters.includes('newAiSummary')) {
      result = result.filter(lead => recentActivityLeadIds.has(lead.id));
    }
    
    return result;
  }, [leads, selectedTags, tagFilterMode, filteredLeadIds, activeSmartFilters, followUpLeadIds, recentActivityLeadIds]);

  // Use persisted form state for new leads only (not editing)
  const { 
    values: formValues, 
    setValues: setFormValues, 
    updateField, 
    clearDraft 
  } = usePersistedFormState('crm_lead', defaultFormValues, formOpen && !editingLead);

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
    {
      key: 'serviceCategory',
      label: 'Category',
      render: (lead: Lead) => (
        <span className="text-sm text-muted-foreground">{lead.serviceCategory || '-'}</span>
      ),
    },
    {
      key: 'location',
      label: 'Location',
      render: (lead: Lead) => (
        <div className="flex items-center gap-1.5">
          {(lead.city || lead.state) ? (
            <>
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm">{[lead.city, lead.state].filter(Boolean).join(', ')}</span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'googleRating',
      label: 'Rating',
      render: (lead: Lead) => lead.googleRating ? (
        <div className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
          <span className="text-sm">{lead.googleRating}</span>
          {lead.googleReviewCount && (
            <span className="text-xs text-muted-foreground">({lead.googleReviewCount})</span>
          )}
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">-</span>
      ),
    },
    {
      key: 'website',
      label: 'Web',
      render: (lead: Lead) => lead.website ? (
        <a 
          href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} 
          target="_blank" 
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-primary hover:underline"
        >
          <Globe className="h-4 w-4" />
        </a>
      ) : lead.hasWebsite ? (
        <Globe className="h-4 w-4 text-muted-foreground" />
      ) : (
        <span className="text-sm text-muted-foreground">-</span>
      ),
    },
    {
      key: 'pipelineStatus',
      label: 'Pipeline',
      render: (lead: Lead) => <PipelineStatusBadge status={lead.pipelineStatus} />,
    },
    // Tags column - conditionally shown with feature flag
    ...(isEnabled('aiCrmPhase2') ? [{
      key: 'tags',
      label: 'Tags',
      render: (lead: Lead) => {
        const leadTags = tagsMap.get(lead.id) || [];
        return <LeadTagBadges tags={leadTags} maxVisible={2} />;
      },
    }] : []),
    // Last Seen column - Phase 2
    ...(isEnabled('aiCrmPhase2') ? [{
      key: 'lastSeen',
      label: 'Last Seen',
      render: (lead: Lead) => <LeadLastSeenBadge leadId={lead.id} />,
    }] : []),
    // Voice Summary column - Phase 3
    ...(isEnabled('aiCrmPhase2') ? [{
      key: 'voiceSummary',
      label: '',
      render: (lead: Lead) => (
        <InlineVoiceSummaryButton 
          leadId={lead.id} 
          leadName={`${lead.firstName} ${lead.lastName}`} 
        />
      ),
    }] : []),
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
      title: lead.title || '',
      serviceCategory: lead.serviceCategory || '',
      industry: lead.industry || '',
      address: lead.address || '',
      city: lead.city || '',
      state: lead.state || '',
      zipCode: lead.zipCode || '',
      website: lead.website || '',
      facebookUrl: lead.facebookUrl || '',
      instagramHandle: lead.instagramHandle || '',
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
      clearDraft();
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

      {/* Filters */}
      {isEnabled('aiCrmPhase2') && (
        <div className="flex flex-wrap items-center gap-2">
          <SmartFilters
            activeFilters={activeSmartFilters}
            onToggleFilter={toggleSmartFilter}
          />
          <LeadTagFilter
            selectedTags={selectedTags}
            onSelectedTagsChange={setSelectedTags}
            filterMode={tagFilterMode}
            onFilterModeChange={setTagFilterMode}
          />
          {(selectedTags.length > 0 || activeSmartFilters.length > 0) && (
            <span className="text-sm text-muted-foreground">
              Showing {filteredLeads.length} of {leads.length} leads
            </span>
          )}
        </div>
      )}

      <DataTable
        data={filteredLeads}
        columns={columns}
        searchPlaceholder="Search leads..."
        searchKeys={['firstName', 'lastName', 'email', 'company', 'city', 'serviceCategory']}
        onRowClick={handleRowClick}
      />

      <EntityForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingLead ? 'Edit Lead' : 'New Lead'}
        fields={leadFields}
        values={formValues}
        onChange={updateField}
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
