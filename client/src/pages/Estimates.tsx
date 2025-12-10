import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Send, Eye, FileText, MoreHorizontal, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { CRMLayout } from '@/components/crm/CRMLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEstimates, useDeleteEstimate } from '@/hooks/useEstimates';
import { useCreateInvoiceFromEstimate } from '@/hooks/useInvoices';
import { EstimateStatusBadge } from '@/components/invoicing/EstimateStatusBadge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const Estimates = () => {
  const navigate = useNavigate();
  const { data: estimates = [], isLoading } = useEstimates();
  const deleteEstimate = useDeleteEstimate();
  const createInvoice = useCreateInvoiceFromEstimate();
  const [sendingId, setSendingId] = useState<string | null>(null);

  const handleSendEstimate = async (estimateId: string) => {
    setSendingId(estimateId);
    try {
      const { error } = await supabase.functions.invoke('send-estimate', {
        body: { estimateId },
      });
      if (error) throw error;
      toast.success('Estimate sent successfully');
    } catch (error: any) {
      toast.error('Failed to send estimate: ' + error.message);
    } finally {
      setSendingId(null);
    }
  };

  const handleCreateInvoice = async (estimateId: string) => {
    try {
      const invoice = await createInvoice.mutateAsync(estimateId);
      toast.success('Invoice created successfully');
      navigate(`/invoices`);
    } catch (error: any) {
      toast.error('Failed to create invoice: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this estimate?')) return;
    try {
      await deleteEstimate.mutateAsync(id);
      toast.success('Estimate deleted');
    } catch (error: any) {
      toast.error('Failed to delete estimate');
    }
  };

  if (isLoading) {
    return (
      <CRMLayout>
        <div className="p-6">Loading...</div>
      </CRMLayout>
    );
  }

  return (
    <CRMLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Estimates</h1>
            <p className="text-muted-foreground">Create and manage customer estimates</p>
          </div>
          <Button onClick={() => navigate('/estimates/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Estimate
          </Button>
        </div>

        {estimates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No estimates yet</h3>
              <p className="text-muted-foreground mb-4">Create your first estimate to get started</p>
              <Button onClick={() => navigate('/estimates/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Estimate
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {estimates.map((estimate) => (
              <Card key={estimate.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono text-sm text-muted-foreground">
                          {estimate.estimateNumber}
                        </span>
                        <EstimateStatusBadge status={estimate.status} validUntil={estimate.validUntil} />
                      </div>
                      <h3 className="font-medium">{estimate.customerName}</h3>
                      <p className="text-sm text-muted-foreground">{estimate.jobTitle}</p>
                    </div>
                    
                    <div className="text-right mr-4">
                      <p className="text-lg font-semibold">${estimate.totalAmount.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(estimate.createdAt, 'MMM d, yyyy')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/estimates/${estimate.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      
                      {estimate.status === 'draft' && (
                        <Button
                          size="sm"
                          onClick={() => handleSendEstimate(estimate.id)}
                          disabled={sendingId === estimate.id}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          {sendingId === estimate.id ? 'Sending...' : 'Send'}
                        </Button>
                      )}
                      
                      {estimate.status === 'accepted' && !estimate.invoiceGenerated && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleCreateInvoice(estimate.id)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Create Invoice
                        </Button>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/estimates/${estimate.id}/edit`)}>
                            Edit
                          </DropdownMenuItem>
                          {estimate.status !== 'draft' && (
                            <DropdownMenuItem onClick={() => handleSendEstimate(estimate.id)}>
                              Resend
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(estimate.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </CRMLayout>
  );
};

export default Estimates;
