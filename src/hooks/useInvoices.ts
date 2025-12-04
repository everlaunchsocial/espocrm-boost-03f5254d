import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Invoice, InvoiceItem, LineItemInput } from '@/types/invoicing';

const toInvoice = (row: any): Invoice => ({
  id: row.id,
  contactId: row.contact_id,
  leadId: row.lead_id,
  estimateId: row.estimate_id,
  invoiceNumber: row.invoice_number,
  customerName: row.customer_name,
  customerEmail: row.customer_email,
  customerPhone: row.customer_phone,
  customerAddress: row.customer_address,
  customerCity: row.customer_city,
  customerState: row.customer_state,
  customerZip: row.customer_zip,
  jobTitle: row.job_title,
  jobDescription: row.job_description,
  subtotal: Number(row.subtotal),
  taxRate: Number(row.tax_rate),
  taxAmount: Number(row.tax_amount),
  totalAmount: Number(row.total_amount),
  amountPaid: Number(row.amount_paid),
  status: row.status,
  dueDate: row.due_date ? new Date(row.due_date) : undefined,
  paidDate: row.paid_date ? new Date(row.paid_date) : undefined,
  sentAt: row.sent_at ? new Date(row.sent_at) : undefined,
  viewedAt: row.viewed_at ? new Date(row.viewed_at) : undefined,
  beforePhotoUrl: row.before_photo_url,
  duringPhotoUrl: row.during_photo_url,
  afterPhotoUrl: row.after_photo_url,
  notes: row.notes,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

const toInvoiceItem = (row: any): InvoiceItem => ({
  id: row.id,
  invoiceId: row.invoice_id,
  description: row.description,
  quantity: Number(row.quantity),
  unitPrice: Number(row.unit_price),
  lineTotal: Number(row.line_total),
  sortOrder: row.sort_order,
});

export const useInvoices = (status?: 'active' | 'paid') => {
  return useQuery({
    queryKey: ['invoices', status],
    queryFn: async () => {
      let query = supabase.from('invoices').select('*').order('created_at', { ascending: false });
      
      if (status === 'active') {
        query = query.in('status', ['draft', 'sent', 'partial', 'overdue']);
      } else if (status === 'paid') {
        query = query.eq('status', 'paid');
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data.map(toInvoice);
    },
  });
};

export const useInvoice = (id: string) => {
  return useQuery({
    queryKey: ['invoices', id],
    queryFn: async () => {
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .single();
      if (invoiceError) throw invoiceError;

      const { data: items, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', id)
        .order('sort_order');
      if (itemsError) throw itemsError;

      return {
        ...toInvoice(invoice),
        items: items.map(toInvoiceItem),
      };
    },
    enabled: !!id,
  });
};

export const useAddInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt' | 'items'>;
      items: LineItemInput[];
    }) => {
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          contact_id: data.invoice.contactId,
          lead_id: data.invoice.leadId,
          estimate_id: data.invoice.estimateId,
          invoice_number: data.invoice.invoiceNumber,
          customer_name: data.invoice.customerName,
          customer_email: data.invoice.customerEmail,
          customer_phone: data.invoice.customerPhone,
          customer_address: data.invoice.customerAddress,
          customer_city: data.invoice.customerCity,
          customer_state: data.invoice.customerState,
          customer_zip: data.invoice.customerZip,
          job_title: data.invoice.jobTitle,
          job_description: data.invoice.jobDescription,
          subtotal: data.invoice.subtotal,
          tax_rate: data.invoice.taxRate,
          tax_amount: data.invoice.taxAmount,
          total_amount: data.invoice.totalAmount,
          amount_paid: data.invoice.amountPaid,
          status: data.invoice.status,
          due_date: data.invoice.dueDate?.toISOString().split('T')[0],
          notes: data.invoice.notes,
        })
        .select()
        .single();
      if (invoiceError) throw invoiceError;

      if (data.items.length > 0) {
        const { error: itemsError } = await supabase.from('invoice_items').insert(
          data.items.map((item, index) => ({
            invoice_id: invoice.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            line_total: item.quantity * item.unitPrice,
            sort_order: index,
          }))
        );
        if (itemsError) throw itemsError;
      }

      return toInvoice(invoice);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: string;
      invoice: Partial<Invoice>;
      items?: LineItemInput[];
    }) => {
      const updateData: any = {};
      if (data.invoice.customerName !== undefined) updateData.customer_name = data.invoice.customerName;
      if (data.invoice.customerEmail !== undefined) updateData.customer_email = data.invoice.customerEmail;
      if (data.invoice.customerPhone !== undefined) updateData.customer_phone = data.invoice.customerPhone;
      if (data.invoice.customerAddress !== undefined) updateData.customer_address = data.invoice.customerAddress;
      if (data.invoice.customerCity !== undefined) updateData.customer_city = data.invoice.customerCity;
      if (data.invoice.customerState !== undefined) updateData.customer_state = data.invoice.customerState;
      if (data.invoice.customerZip !== undefined) updateData.customer_zip = data.invoice.customerZip;
      if (data.invoice.jobTitle !== undefined) updateData.job_title = data.invoice.jobTitle;
      if (data.invoice.jobDescription !== undefined) updateData.job_description = data.invoice.jobDescription;
      if (data.invoice.subtotal !== undefined) updateData.subtotal = data.invoice.subtotal;
      if (data.invoice.taxRate !== undefined) updateData.tax_rate = data.invoice.taxRate;
      if (data.invoice.taxAmount !== undefined) updateData.tax_amount = data.invoice.taxAmount;
      if (data.invoice.totalAmount !== undefined) updateData.total_amount = data.invoice.totalAmount;
      if (data.invoice.amountPaid !== undefined) updateData.amount_paid = data.invoice.amountPaid;
      if (data.invoice.status !== undefined) updateData.status = data.invoice.status;
      if (data.invoice.dueDate !== undefined) updateData.due_date = data.invoice.dueDate?.toISOString().split('T')[0];
      if (data.invoice.paidDate !== undefined) updateData.paid_date = data.invoice.paidDate?.toISOString().split('T')[0];
      if (data.invoice.sentAt !== undefined) updateData.sent_at = data.invoice.sentAt?.toISOString();
      if (data.invoice.viewedAt !== undefined) updateData.viewed_at = data.invoice.viewedAt?.toISOString();
      if (data.invoice.notes !== undefined) updateData.notes = data.invoice.notes;

      const { error: invoiceError } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', data.id);
      if (invoiceError) throw invoiceError;

      if (data.items) {
        await supabase.from('invoice_items').delete().eq('invoice_id', data.id);
        if (data.items.length > 0) {
          const { error: itemsError } = await supabase.from('invoice_items').insert(
            data.items.map((item, index) => ({
              invoice_id: data.id,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              line_total: item.quantity * item.unitPrice,
              sort_order: index,
            }))
          );
          if (itemsError) throw itemsError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};

export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};

export const useRecordPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { invoiceId: string; amount: number; notes?: string }) => {
      const { data: invoice, error: fetchError } = await supabase
        .from('invoices')
        .select('amount_paid, total_amount')
        .eq('id', data.invoiceId)
        .single();
      if (fetchError) throw fetchError;

      const newAmountPaid = Number(invoice.amount_paid) + data.amount;
      const isPaid = newAmountPaid >= Number(invoice.total_amount);

      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          amount_paid: newAmountPaid,
          status: isPaid ? 'paid' : 'partial',
          paid_date: isPaid ? new Date().toISOString().split('T')[0] : null,
        })
        .eq('id', data.invoiceId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};

export const generateInvoiceNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}${month}-${random}`;
};

export const useCreateInvoiceFromEstimate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (estimateId: string) => {
      // Fetch the estimate with items
      const { data: estimate, error: estimateError } = await supabase
        .from('estimates')
        .select('*')
        .eq('id', estimateId)
        .single();
      if (estimateError) throw estimateError;

      const { data: items, error: itemsError } = await supabase
        .from('estimate_items')
        .select('*')
        .eq('estimate_id', estimateId)
        .order('sort_order');
      if (itemsError) throw itemsError;

      // Create the invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          contact_id: estimate.contact_id,
          lead_id: estimate.lead_id,
          estimate_id: estimateId,
          invoice_number: generateInvoiceNumber(),
          customer_name: estimate.customer_name,
          customer_email: estimate.customer_email,
          customer_phone: estimate.customer_phone,
          customer_address: estimate.customer_address,
          customer_city: estimate.customer_city,
          customer_state: estimate.customer_state,
          customer_zip: estimate.customer_zip,
          job_title: estimate.job_title,
          job_description: estimate.job_description,
          subtotal: estimate.subtotal,
          tax_rate: estimate.tax_rate,
          tax_amount: estimate.tax_amount,
          total_amount: estimate.total_amount,
          amount_paid: 0,
          status: 'draft',
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          notes: estimate.notes,
        })
        .select()
        .single();
      if (invoiceError) throw invoiceError;

      // Create invoice items
      if (items.length > 0) {
        const { error: invoiceItemsError } = await supabase.from('invoice_items').insert(
          items.map((item: any) => ({
            invoice_id: invoice.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            line_total: item.line_total,
            sort_order: item.sort_order,
          }))
        );
        if (invoiceItemsError) throw invoiceItemsError;
      }

      // Mark estimate as invoice generated
      await supabase
        .from('estimates')
        .update({ invoice_generated: true })
        .eq('id', estimateId);

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
    },
  });
};
