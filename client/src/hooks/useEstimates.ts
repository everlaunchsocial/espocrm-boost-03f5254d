import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Estimate, EstimateItem, LineItemInput } from '@/types/invoicing';

const toEstimate = (row: any): Estimate => ({
  id: row.id,
  contactId: row.contact_id,
  leadId: row.lead_id,
  estimateNumber: row.estimate_number,
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
  depositRequired: row.deposit_required,
  depositAmount: Number(row.deposit_amount),
  depositType: row.deposit_type,
  status: row.status,
  validUntil: row.valid_until ? new Date(row.valid_until) : undefined,
  sentAt: row.sent_at ? new Date(row.sent_at) : undefined,
  viewedAt: row.viewed_at ? new Date(row.viewed_at) : undefined,
  acceptedAt: row.accepted_at ? new Date(row.accepted_at) : undefined,
  declinedAt: row.declined_at ? new Date(row.declined_at) : undefined,
  signatureData: row.signature_data,
  signerName: row.signer_name,
  signerIp: row.signer_ip,
  beforePhotoUrl: row.before_photo_url,
  duringPhotoUrl: row.during_photo_url,
  afterPhotoUrl: row.after_photo_url,
  notes: row.notes,
  termsAndConditions: row.terms_and_conditions,
  invoiceGenerated: row.invoice_generated,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

const toEstimateItem = (row: any): EstimateItem => ({
  id: row.id,
  estimateId: row.estimate_id,
  description: row.description,
  quantity: Number(row.quantity),
  unitPrice: Number(row.unit_price),
  lineTotal: Number(row.line_total),
  sortOrder: row.sort_order,
});

export const useEstimates = () => {
  return useQuery({
    queryKey: ['estimates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estimates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(toEstimate);
    },
  });
};

export const useEstimate = (id: string) => {
  return useQuery({
    queryKey: ['estimates', id],
    queryFn: async () => {
      const { data: estimate, error: estimateError } = await supabase
        .from('estimates')
        .select('*')
        .eq('id', id)
        .single();
      if (estimateError) throw estimateError;

      const { data: items, error: itemsError } = await supabase
        .from('estimate_items')
        .select('*')
        .eq('estimate_id', id)
        .order('sort_order');
      if (itemsError) throw itemsError;

      return {
        ...toEstimate(estimate),
        items: items.map(toEstimateItem),
      };
    },
    enabled: !!id,
  });
};

export const useAddEstimate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      estimate: Omit<Estimate, 'id' | 'createdAt' | 'updatedAt' | 'items'>;
      items: LineItemInput[];
    }) => {
      const { data: estimate, error: estimateError } = await supabase
        .from('estimates')
        .insert({
          contact_id: data.estimate.contactId,
          lead_id: data.estimate.leadId,
          estimate_number: data.estimate.estimateNumber,
          customer_name: data.estimate.customerName,
          customer_email: data.estimate.customerEmail,
          customer_phone: data.estimate.customerPhone,
          customer_address: data.estimate.customerAddress,
          customer_city: data.estimate.customerCity,
          customer_state: data.estimate.customerState,
          customer_zip: data.estimate.customerZip,
          job_title: data.estimate.jobTitle,
          job_description: data.estimate.jobDescription,
          subtotal: data.estimate.subtotal,
          tax_rate: data.estimate.taxRate,
          tax_amount: data.estimate.taxAmount,
          total_amount: data.estimate.totalAmount,
          deposit_required: data.estimate.depositRequired,
          deposit_amount: data.estimate.depositAmount,
          deposit_type: data.estimate.depositType,
          status: data.estimate.status,
          valid_until: data.estimate.validUntil?.toISOString().split('T')[0],
          notes: data.estimate.notes,
          terms_and_conditions: data.estimate.termsAndConditions,
        })
        .select()
        .single();
      if (estimateError) throw estimateError;

      if (data.items.length > 0) {
        const { error: itemsError } = await supabase.from('estimate_items').insert(
          data.items.map((item, index) => ({
            estimate_id: estimate.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            line_total: item.quantity * item.unitPrice,
            sort_order: index,
          }))
        );
        if (itemsError) throw itemsError;
      }

      return toEstimate(estimate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
    },
  });
};

export const useUpdateEstimate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: string;
      estimate: Partial<Estimate>;
      items?: LineItemInput[];
    }) => {
      const updateData: any = {};
      if (data.estimate.customerName !== undefined) updateData.customer_name = data.estimate.customerName;
      if (data.estimate.customerEmail !== undefined) updateData.customer_email = data.estimate.customerEmail;
      if (data.estimate.customerPhone !== undefined) updateData.customer_phone = data.estimate.customerPhone;
      if (data.estimate.customerAddress !== undefined) updateData.customer_address = data.estimate.customerAddress;
      if (data.estimate.customerCity !== undefined) updateData.customer_city = data.estimate.customerCity;
      if (data.estimate.customerState !== undefined) updateData.customer_state = data.estimate.customerState;
      if (data.estimate.customerZip !== undefined) updateData.customer_zip = data.estimate.customerZip;
      if (data.estimate.jobTitle !== undefined) updateData.job_title = data.estimate.jobTitle;
      if (data.estimate.jobDescription !== undefined) updateData.job_description = data.estimate.jobDescription;
      if (data.estimate.subtotal !== undefined) updateData.subtotal = data.estimate.subtotal;
      if (data.estimate.taxRate !== undefined) updateData.tax_rate = data.estimate.taxRate;
      if (data.estimate.taxAmount !== undefined) updateData.tax_amount = data.estimate.taxAmount;
      if (data.estimate.totalAmount !== undefined) updateData.total_amount = data.estimate.totalAmount;
      if (data.estimate.depositRequired !== undefined) updateData.deposit_required = data.estimate.depositRequired;
      if (data.estimate.depositAmount !== undefined) updateData.deposit_amount = data.estimate.depositAmount;
      if (data.estimate.depositType !== undefined) updateData.deposit_type = data.estimate.depositType;
      if (data.estimate.status !== undefined) updateData.status = data.estimate.status;
      if (data.estimate.validUntil !== undefined) updateData.valid_until = data.estimate.validUntil?.toISOString().split('T')[0];
      if (data.estimate.notes !== undefined) updateData.notes = data.estimate.notes;
      if (data.estimate.sentAt !== undefined) updateData.sent_at = data.estimate.sentAt?.toISOString();
      if (data.estimate.viewedAt !== undefined) updateData.viewed_at = data.estimate.viewedAt?.toISOString();
      if (data.estimate.acceptedAt !== undefined) updateData.accepted_at = data.estimate.acceptedAt?.toISOString();
      if (data.estimate.signatureData !== undefined) updateData.signature_data = data.estimate.signatureData;
      if (data.estimate.signerName !== undefined) updateData.signer_name = data.estimate.signerName;
      if (data.estimate.invoiceGenerated !== undefined) updateData.invoice_generated = data.estimate.invoiceGenerated;

      const { error: estimateError } = await supabase
        .from('estimates')
        .update(updateData)
        .eq('id', data.id);
      if (estimateError) throw estimateError;

      if (data.items) {
        await supabase.from('estimate_items').delete().eq('estimate_id', data.id);
        if (data.items.length > 0) {
          const { error: itemsError } = await supabase.from('estimate_items').insert(
            data.items.map((item, index) => ({
              estimate_id: data.id,
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
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
    },
  });
};

export const useDeleteEstimate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('estimates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
    },
  });
};

export const generateEstimateNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `EST-${year}${month}-${random}`;
};
