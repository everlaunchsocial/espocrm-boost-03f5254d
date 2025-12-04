import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomerSelector } from '@/components/invoicing/CustomerSelector';
import { LineItemsEditor } from '@/components/invoicing/LineItemsEditor';
import { TotalsSummary } from '@/components/invoicing/TotalsSummary';
import { useAddInvoice, generateInvoiceNumber } from '@/hooks/useInvoices';
import { useAddContact } from '@/hooks/useCRMData';
import { LineItemInput } from '@/types/invoicing';
import { toast } from 'sonner';

const CreateInvoice = () => {
  const navigate = useNavigate();
  const addInvoice = useAddInvoice();
  const addContact = useAddContact();

  const [invoiceMode, setInvoiceMode] = useState<'generic' | 'home-improvement'>('generic');
  const [customerType, setCustomerType] = useState<'contact' | 'lead' | 'new'>('new');
  const [contactId, setContactId] = useState<string>();
  const [leadId, setLeadId] = useState<string>();
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerState, setCustomerState] = useState('');
  const [customerZip, setCustomerZip] = useState('');
  
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  
  const [items, setItems] = useState<LineItemInput[]>([
    { description: '', quantity: 1, unitPrice: 0, discountType: 'fixed', discountAmount: 0 },
  ]);
  
  const [taxRate, setTaxRate] = useState(0);
  const [dueDays, setDueDays] = useState(30);
  const [notes, setNotes] = useState('');
  const [createContactOnSave, setCreateContactOnSave] = useState(false);
  
  // Overall discount
  const [overallDiscountType, setOverallDiscountType] = useState<'percentage' | 'fixed'>('fixed');
  const [overallDiscountAmount, setOverallDiscountAmount] = useState(0);

  // Calculate line item discounts
  const calculateLineItemDiscount = (item: LineItemInput) => {
    const baseTotal = (item.quantity || 0) * (item.unitPrice || 0);
    if (!item.discountAmount || item.discountAmount <= 0) return 0;
    if (item.discountType === 'percentage') {
      return baseTotal * (item.discountAmount / 100);
    }
    return item.discountAmount;
  };

  const lineItemDiscounts = items.reduce((sum, item) => sum + calculateLineItemDiscount(item), 0);
  
  // Subtotal before any discounts
  const grossSubtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  
  // Subtotal after line item discounts
  const subtotalAfterLineDiscounts = grossSubtotal - lineItemDiscounts;
  
  // Calculate overall discount
  const overallDiscount = overallDiscountAmount > 0
    ? overallDiscountType === 'percentage'
      ? subtotalAfterLineDiscounts * (overallDiscountAmount / 100)
      : overallDiscountAmount
    : 0;
  
  // Final subtotal after all discounts
  const subtotal = Math.max(0, subtotalAfterLineDiscounts - overallDiscount);
  
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const handleCustomerSelect = (customer: any) => {
    setCustomerType(customer.type);
    if (customer.type === 'contact') {
      setContactId(customer.id);
      setLeadId(undefined);
    } else if (customer.type === 'lead') {
      setLeadId(customer.id);
      setContactId(undefined);
    } else {
      setContactId(undefined);
      setLeadId(undefined);
    }
    setCustomerName(customer.name || '');
    setCustomerEmail(customer.email || '');
    setCustomerPhone(customer.phone || '');
    setCustomerAddress(customer.address || '');
    setCustomerCity(customer.city || '');
    setCustomerState(customer.state || '');
    setCustomerZip(customer.zip || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      toast.error('Customer name is required');
      return;
    }
    if (invoiceMode === 'home-improvement' && !jobTitle.trim()) {
      toast.error('Job title is required');
      return;
    }
    if (items.length === 0 || !items.some(i => i.description.trim())) {
      toast.error('At least one line item is required');
      return;
    }
    
    // For generic mode, use a default job title
    const finalJobTitle = invoiceMode === 'generic' ? 'Services' : jobTitle;

    try {
      let newContactId = contactId;

      // Create contact if requested
      if (createContactOnSave && customerType === 'new' && customerEmail) {
        const nameParts = customerName.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        const contact = await addContact.mutateAsync({
          firstName,
          lastName,
          email: customerEmail,
          phone: customerPhone,
          status: 'client',
        });
        newContactId = contact.id;
      }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + dueDays);

      await addInvoice.mutateAsync({
        invoice: {
          contactId: newContactId,
          leadId,
          invoiceNumber: generateInvoiceNumber(),
          customerName,
          customerEmail,
          customerPhone,
          customerAddress,
          customerCity,
          customerState,
          customerZip,
          jobTitle: finalJobTitle,
          jobDescription: invoiceMode === 'generic' ? '' : jobDescription,
          subtotal,
          taxRate,
          taxAmount,
          totalAmount: total,
          amountPaid: 0,
          status: 'draft',
          dueDate,
          notes,
        },
        items: items.filter(i => i.description.trim()),
      });

      toast.success('Invoice created successfully');
      navigate('/invoices');
    } catch (error: any) {
      toast.error('Failed to create invoice: ' + error.message);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/invoices')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Create Invoice</h1>
            <p className="text-muted-foreground">Create a new invoice for a customer</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Invoice Mode Toggle */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Invoice Type</Label>
                  <p className="text-sm text-muted-foreground">Choose the type of invoice you're creating</p>
                </div>
                <Tabs value={invoiceMode} onValueChange={(v) => setInvoiceMode(v as 'generic' | 'home-improvement')}>
                  <TabsList>
                    <TabsTrigger value="generic">Generic</TabsTrigger>
                    <TabsTrigger value="home-improvement">Home Improvement</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Select from CRM</Label>
                <CustomerSelector onSelect={handleCustomerSelect} value={customerName} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="customerEmail">Email</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="customer@email.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerPhone">Phone</Label>
                  <Input
                    id="customerPhone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="(555) 555-5555"
                  />
                </div>
                <div>
                  <Label htmlFor="customerAddress">Street Address</Label>
                  <Input
                    id="customerAddress"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="123 Main St"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="customerCity">City</Label>
                  <Input
                    id="customerCity"
                    value={customerCity}
                    onChange={(e) => setCustomerCity(e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label htmlFor="customerState">State</Label>
                  <Input
                    id="customerState"
                    value={customerState}
                    onChange={(e) => setCustomerState(e.target.value)}
                    placeholder="State"
                  />
                </div>
                <div>
                  <Label htmlFor="customerZip">Zip Code</Label>
                  <Input
                    id="customerZip"
                    value={customerZip}
                    onChange={(e) => setCustomerZip(e.target.value)}
                    placeholder="12345"
                  />
                </div>
              </div>

              {customerType === 'new' && customerEmail && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="createContact"
                    checked={createContactOnSave}
                    onCheckedChange={setCreateContactOnSave}
                  />
                  <Label htmlFor="createContact">Add this customer as a new contact in CRM</Label>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Job Details - Only show in home-improvement mode */}
          {invoiceMode === 'home-improvement' && (
            <Card>
              <CardHeader>
                <CardTitle>Job Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="jobTitle">Job Title *</Label>
                  <Input
                    id="jobTitle"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g., Bathroom Renovation"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="jobDescription">Job Description</Label>
                  <Textarea
                    id="jobDescription"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Describe the work completed..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <LineItemsEditor items={items} onChange={setItems} />
            </CardContent>
          </Card>

          {/* Pricing & Totals */}
          <Card>
            <CardHeader>
              <CardTitle>Totals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="taxRate">Tax Rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="dueDays">Due In (days)</Label>
                  <Input
                    id="dueDays"
                    type="number"
                    min="1"
                    value={dueDays}
                    onChange={(e) => setDueDays(parseInt(e.target.value) || 30)}
                  />
                </div>
                <div>
                  <Label>Overall Discount</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={overallDiscountAmount || ''}
                      onChange={(e) => setOverallDiscountAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="flex-1"
                    />
                    <Select
                      value={overallDiscountType}
                      onValueChange={(v) => setOverallDiscountType(v as 'percentage' | 'fixed')}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">$</SelectItem>
                        <SelectItem value="percentage">%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <TotalsSummary
                subtotal={grossSubtotal}
                lineItemDiscounts={lineItemDiscounts}
                overallDiscountType={overallDiscountType}
                overallDiscountAmount={overallDiscountAmount}
                taxRate={taxRate}
                taxAmount={taxAmount}
                total={total}
              />
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes for the customer..."
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate('/invoices')}>
              Cancel
            </Button>
            <Button type="submit" disabled={addInvoice.isPending}>
              {addInvoice.isPending ? 'Creating...' : 'Create Invoice'}
            </Button>
          </div>
        </form>
      </div>
  );
};

export default CreateInvoice;
