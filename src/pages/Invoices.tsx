import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Send, Eye, DollarSign, MoreHorizontal, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { CRMLayout } from '@/components/crm/CRMLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useInvoices, useDeleteInvoice } from '@/hooks/useInvoices';
import { InvoiceStatusBadge } from '@/components/invoicing/InvoiceStatusBadge';
import { RecordPaymentModal } from '@/components/invoicing/RecordPaymentModal';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const Invoices = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'active' | 'paid'>('active');
  const { data: invoices = [], isLoading } = useInvoices(activeTab);
  const deleteInvoice = useDeleteInvoice();
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<any>(null);

  const handleSendInvoice = async (invoiceId: string) => {
    setSendingId(invoiceId);
    try {
      const { error } = await supabase.functions.invoke('send-invoice', {
        body: { invoiceId },
      });
      if (error) throw error;
      toast.success('Invoice sent successfully');
    } catch (error: any) {
      toast.error('Failed to send invoice: ' + error.message);
    } finally {
      setSendingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await deleteInvoice.mutateAsync(id);
      toast.success('Invoice deleted');
    } catch (error: any) {
      toast.error('Failed to delete invoice');
    }
  };

  const InvoiceList = ({ invoices }: { invoices: any[] }) => (
    <div className="grid gap-4">
      {invoices.map((invoice) => (
        <Card key={invoice.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-mono text-sm text-muted-foreground">
                    {invoice.invoiceNumber}
                  </span>
                  <InvoiceStatusBadge status={invoice.status} dueDate={invoice.dueDate} />
                </div>
                <h3 className="font-medium">{invoice.customerName}</h3>
                <p className="text-sm text-muted-foreground">{invoice.jobTitle}</p>
              </div>
              
              <div className="text-right mr-4">
                <p className="text-lg font-semibold">${invoice.totalAmount.toFixed(2)}</p>
                {invoice.amountPaid > 0 && invoice.amountPaid < invoice.totalAmount && (
                  <p className="text-sm text-green-600">
                    ${invoice.amountPaid.toFixed(2)} paid
                  </p>
                )}
                {invoice.dueDate && (
                  <p className="text-xs text-muted-foreground">
                    Due: {format(invoice.dueDate, 'MMM d, yyyy')}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/invoices/${invoice.id}`)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                
                {invoice.status !== 'paid' && (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setPaymentInvoice(invoice)}
                    >
                      <DollarSign className="h-4 w-4 mr-1" />
                      Record Payment
                    </Button>
                    
                    <Button
                      size="sm"
                      onClick={() => handleSendInvoice(invoice.id)}
                      disabled={sendingId === invoice.id}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      {sendingId === invoice.id ? 'Sending...' : 'Send'}
                    </Button>
                  </>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/invoices/${invoice.id}/edit`)}>
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDelete(invoice.id)}
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
  );

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
            <h1 className="text-2xl font-bold">Invoices</h1>
            <p className="text-muted-foreground">Manage and track customer invoices</p>
          </div>
          <Button onClick={() => navigate('/invoices/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'paid')}>
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4">
            {invoices.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No active invoices</h3>
                  <p className="text-muted-foreground mb-4">Create your first invoice to get started</p>
                  <Button onClick={() => navigate('/invoices/new')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Invoice
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <InvoiceList invoices={invoices} />
            )}
          </TabsContent>

          <TabsContent value="paid" className="mt-4">
            {invoices.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No paid invoices yet</p>
                </CardContent>
              </Card>
            ) : (
              <InvoiceList invoices={invoices} />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {paymentInvoice && (
        <RecordPaymentModal
          invoice={paymentInvoice}
          onClose={() => setPaymentInvoice(null)}
        />
      )}
    </CRMLayout>
  );
};

export default Invoices;
