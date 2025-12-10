import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Invoice, InvoiceItem } from '@/types/invoicing';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface InvoicePDFButtonProps {
  invoiceId: string;
  invoiceNumber: string;
}

export const InvoicePDFButton = ({ invoiceId, invoiceNumber }: InvoicePDFButtonProps) => {
  const [loading, setLoading] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date?: Date | string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleDownload = async () => {
    setLoading(true);
    try {
      // Fetch invoice with items
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();
      if (invoiceError) throw invoiceError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('sort_order');
      if (itemsError) throw itemsError;

      const invoice: Invoice = {
        id: invoiceData.id,
        invoiceNumber: invoiceData.invoice_number,
        customerName: invoiceData.customer_name,
        customerEmail: invoiceData.customer_email,
        customerPhone: invoiceData.customer_phone,
        customerAddress: invoiceData.customer_address,
        customerCity: invoiceData.customer_city,
        customerState: invoiceData.customer_state,
        customerZip: invoiceData.customer_zip,
        jobTitle: invoiceData.job_title,
        jobDescription: invoiceData.job_description,
        subtotal: Number(invoiceData.subtotal),
        taxRate: Number(invoiceData.tax_rate),
        taxAmount: Number(invoiceData.tax_amount),
        totalAmount: Number(invoiceData.total_amount),
        amountPaid: Number(invoiceData.amount_paid),
        status: invoiceData.status as Invoice['status'],
        dueDate: invoiceData.due_date ? new Date(invoiceData.due_date) : undefined,
        notes: invoiceData.notes,
        createdAt: new Date(invoiceData.created_at),
        updatedAt: new Date(invoiceData.updated_at),
        items: itemsData.map((item: any): InvoiceItem => ({
          id: item.id,
          invoiceId: item.invoice_id,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unit_price),
          lineTotal: Number(item.line_total),
          sortOrder: item.sort_order,
          discountType: item.discount_type || 'fixed',
          discountAmount: Number(item.discount_amount) || 0,
        })),
      };

      // Create PDF content
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      document.body.appendChild(container);

      container.innerHTML = `
        <div style="width: 800px; padding: 40px; background-color: #ffffff; font-family: Arial, sans-serif; color: #1a1a1a;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
            <div>
              <h1 style="font-size: 32px; font-weight: bold; margin: 0; color: #1a1a1a;">INVOICE</h1>
              <p style="font-size: 14px; color: #666; margin: 4px 0 0 0;">${invoice.invoiceNumber}</p>
            </div>
            <div style="text-align: right;">
              <p style="font-size: 14px; margin: 4px 0; color: #666;">Date: ${formatDate(invoice.createdAt)}</p>
              ${invoice.dueDate ? `<p style="font-size: 14px; margin: 4px 0; color: #666;">Due: ${formatDate(invoice.dueDate)}</p>` : ''}
              <p style="font-size: 12px; font-weight: bold; color: ${invoice.status === 'paid' ? '#16a34a' : '#ea580c'}; text-transform: uppercase; margin-top: 8px;">${invoice.status}</p>
            </div>
          </div>
          
          <div style="margin-bottom: 30px;">
            <h3 style="font-size: 12px; font-weight: bold; color: #666; margin-bottom: 8px;">BILL TO</h3>
            <p style="font-size: 16px; font-weight: bold; margin: 0 0 4px 0;">${invoice.customerName}</p>
            ${invoice.customerAddress ? `<p style="font-size: 14px; margin: 2px 0; color: #444;">${invoice.customerAddress}</p>` : ''}
            ${[invoice.customerCity, invoice.customerState, invoice.customerZip].filter(Boolean).length > 0 ? `<p style="font-size: 14px; margin: 2px 0; color: #444;">${[invoice.customerCity, invoice.customerState, invoice.customerZip].filter(Boolean).join(', ')}</p>` : ''}
            ${invoice.customerEmail ? `<p style="font-size: 14px; margin: 2px 0; color: #444;">${invoice.customerEmail}</p>` : ''}
            ${invoice.customerPhone ? `<p style="font-size: 14px; margin: 2px 0; color: #444;">${invoice.customerPhone}</p>` : ''}
          </div>

          ${invoice.jobTitle ? `
          <div style="margin-bottom: 30px;">
            <h3 style="font-size: 12px; font-weight: bold; color: #666; margin-bottom: 8px;">JOB DETAILS</h3>
            <p style="font-size: 16px; font-weight: bold; margin: 0 0 4px 0;">${invoice.jobTitle}</p>
            ${invoice.jobDescription ? `<p style="font-size: 14px; margin: 2px 0; color: #444;">${invoice.jobDescription}</p>` : ''}
          </div>
          ` : ''}

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="text-align: left; padding: 12px; font-size: 12px; font-weight: bold; color: #666; border-bottom: 2px solid #e5e5e5;">DESCRIPTION</th>
                <th style="text-align: right; padding: 12px; font-size: 12px; font-weight: bold; color: #666; border-bottom: 2px solid #e5e5e5;">QTY</th>
                <th style="text-align: right; padding: 12px; font-size: 12px; font-weight: bold; color: #666; border-bottom: 2px solid #e5e5e5;">PRICE</th>
                <th style="text-align: right; padding: 12px; font-size: 12px; font-weight: bold; color: #666; border-bottom: 2px solid #e5e5e5;">DISCOUNT</th>
                <th style="text-align: right; padding: 12px; font-size: 12px; font-weight: bold; color: #666; border-bottom: 2px solid #e5e5e5;">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items?.map((item) => {
                const discountDisplay = item.discountAmount
                  ? item.discountType === 'percentage'
                    ? `${item.discountAmount}%`
                    : formatCurrency(item.discountAmount)
                  : '-';
                return `
                  <tr>
                    <td style="padding: 12px; font-size: 14px; border-bottom: 1px solid #e5e5e5;">${item.description}</td>
                    <td style="text-align: right; padding: 12px; font-size: 14px; border-bottom: 1px solid #e5e5e5;">${item.quantity}</td>
                    <td style="text-align: right; padding: 12px; font-size: 14px; border-bottom: 1px solid #e5e5e5;">${formatCurrency(item.unitPrice)}</td>
                    <td style="text-align: right; padding: 12px; font-size: 14px; border-bottom: 1px solid #e5e5e5; color: ${item.discountAmount ? '#dc2626' : '#666'};">${discountDisplay}</td>
                    <td style="text-align: right; padding: 12px; font-size: 14px; font-weight: bold; border-bottom: 1px solid #e5e5e5;">${formatCurrency(item.lineTotal)}</td>
                  </tr>
                `;
              }).join('') || ''}
            </tbody>
          </table>

          <div style="display: flex; justify-content: flex-end;">
            <div style="width: 250px;">
              <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px;">
                <span style="color: #666;">Subtotal</span>
                <span>${formatCurrency(invoice.subtotal)}</span>
              </div>
              ${invoice.taxRate > 0 ? `
              <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px;">
                <span style="color: #666;">Tax (${invoice.taxRate}%)</span>
                <span>${formatCurrency(invoice.taxAmount)}</span>
              </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; padding: 12px 0; font-size: 18px; font-weight: bold; border-top: 2px solid #1a1a1a; margin-top: 8px;">
                <span>Total</span>
                <span>${formatCurrency(invoice.totalAmount)}</span>
              </div>
              ${invoice.amountPaid > 0 ? `
              <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #16a34a;">
                <span>Amount Paid</span>
                <span>-${formatCurrency(invoice.amountPaid)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 16px; font-weight: bold;">
                <span>Balance Due</span>
                <span>${formatCurrency(invoice.totalAmount - invoice.amountPaid)}</span>
              </div>
              ` : ''}
            </div>
          </div>

          ${invoice.notes ? `
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
            <h3 style="font-size: 12px; font-weight: bold; color: #666; margin-bottom: 8px;">NOTES</h3>
            <p style="font-size: 14px; color: #444; white-space: pre-wrap;">${invoice.notes}</p>
          </div>
          ` : ''}
        </div>
      `;

      const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${invoice.invoiceNumber}.pdf`);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleDownload} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
    </Button>
  );
};
