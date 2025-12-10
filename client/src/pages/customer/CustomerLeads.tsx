import { useState } from 'react';
import { Users, Search, Phone, MessageSquare, Mic, ShoppingCart, Calendar, Mail, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useCustomerLeads, useCustomerLead, CustomerLead, DateRangeFilter, SourceFilter } from '@/hooks/useCustomerLeads';
import { PipelineStatusBadge } from '@/components/crm/PipelineStatusBadge';
import { format } from 'date-fns';

const ITEMS_PER_PAGE = 25;

function getSourceIcon(source: string) {
  switch (source) {
    case 'Phone':
      return <Phone className="h-4 w-4" />;
    case 'Chat':
      return <MessageSquare className="h-4 w-4" />;
    case 'Voice Web':
      return <Mic className="h-4 w-4" />;
    case 'Checkout':
      return <ShoppingCart className="h-4 w-4" />;
    default:
      return <Users className="h-4 w-4" />;
  }
}

function getSourceVariant(source: string): "default" | "secondary" | "outline" {
  switch (source) {
    case 'Phone':
      return 'default';
    case 'Chat':
      return 'secondary';
    case 'Voice Web':
      return 'outline';
    default:
      return 'secondary';
  }
}

function LeadDetailModal({ 
  leadId, 
  onClose 
}: { 
  leadId: string | null; 
  onClose: () => void;
}) {
  const { data: lead, isLoading } = useCustomerLead(leadId);

  if (!leadId) return null;

  return (
    <Dialog open={!!leadId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Lead Details
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : lead ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {lead.first_name} {lead.last_name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={getSourceVariant(lead.source)} className="gap-1">
                  {getSourceIcon(lead.source)}
                  {lead.source}
                </Badge>
                <PipelineStatusBadge status={lead.pipeline_status} />
              </div>
            </div>

            <div className="grid gap-3 text-sm">
              {lead.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{lead.phone}</span>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{lead.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {format(new Date(lead.created_at), 'MMM d, yyyy h:mm a')}
                </span>
              </div>
            </div>

            {(lead.message || lead.notes) && (
              <div className="pt-2 border-t border-border">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Message / Notes</h4>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {lead.message || lead.notes || 'No additional notes.'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">Lead not found.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function CustomerLeads() {
  const [dateRange, setDateRange] = useState<DateRangeFilter>('last30days');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const { data: leads = [], isLoading } = useCustomerLeads({
    dateRange,
    source: sourceFilter,
    searchQuery,
  });

  // Pagination
  const totalPages = Math.ceil(leads.length / ITEMS_PER_PAGE);
  const paginatedLeads = leads.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  const handleDateRangeChange = (value: DateRangeFilter) => {
    setDateRange(value);
    setCurrentPage(1);
  };

  const handleSourceChange = (value: SourceFilter) => {
    setSourceFilter(value);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-muted-foreground">
            These are the leads your AI assistant has captured from calls and chats.
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
                {searchQuery && (
                  <button
                    onClick={() => handleSearchChange('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Date Range */}
              <Select value={dateRange} onValueChange={handleDateRangeChange}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last7days">Last 7 days</SelectItem>
                  <SelectItem value="last30days">Last 30 days</SelectItem>
                  <SelectItem value="thisMonth">This month</SelectItem>
                  <SelectItem value="allTime">All time</SelectItem>
                </SelectContent>
              </Select>

              {/* Source Filter */}
              <Select value={sourceFilter} onValueChange={handleSourceChange}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="chat">Chat</SelectItem>
                  <SelectItem value="voice_web">Voice Web</SelectItem>
                  <SelectItem value="checkout">Checkout</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Leads Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Captured Leads
              {!isLoading && leads.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {leads.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Click on a lead to view more details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : leads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground text-lg mb-2">
                  No leads yet for this period
                </p>
                <p className="text-sm text-muted-foreground max-w-md">
                  Once your AI starts handling calls and chats, new leads will appear here.
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date/Time</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedLeads.map((lead) => (
                        <TableRow
                          key={lead.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedLeadId(lead.id)}
                        >
                          <TableCell className="text-muted-foreground">
                            {format(new Date(lead.created_at), 'MMM d, h:mm a')}
                          </TableCell>
                          <TableCell className="font-medium">
                            {lead.first_name} {lead.last_name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {lead.phone || '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {lead.email || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getSourceVariant(lead.source)} className="gap-1">
                              {getSourceIcon(lead.source)}
                              {lead.source}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <PipelineStatusBadge status={lead.pipeline_status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                      {Math.min(currentPage * ITEMS_PER_PAGE, leads.length)} of {leads.length} leads
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lead Detail Modal */}
      <LeadDetailModal
        leadId={selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
      />
    </div>
  );
}
