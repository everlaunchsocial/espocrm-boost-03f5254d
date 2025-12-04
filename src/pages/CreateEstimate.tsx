import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { CRMLayout } from '@/components/crm/CRMLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CustomerSelector } from '@/components/invoicing/CustomerSelector';
import { LineItemsEditor } from '@/components/invoicing/LineItemsEditor';
import { TotalsSummary } from '@/components/invoicing/TotalsSummary';
import { useAddEstimate, generateEstimateNumber } from '@/hooks/useEstimates';
import { useAddContact } from '@/hooks/useCRMData';
import { LineItemInput } from '@/types/invoicing';
import { toast } from 'sonner';

const CreateEstimate = () => {
  const navigate = useNavigate();
  const addEstimate = useAddEstimate();
  const addContact = useAddContact();

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
    { description: '', quantity: 1, unitPrice: 0 },
  ]);
  
  const [taxRate, setTaxRate] = useState(0);
  const [depositRequired, setDepositRequired] = useState(false);
  const [depositAmount, setDepositAmount] = useState(0);
  const [depositType, setDepositType] = useState<'fixed' | 'percentage'>('fixed');
  const [validDays, setValidDays] = useState(30);
  const [notes, setNotes] = useState('');
  const [createContactOnSave, setCreateContactOnSave] = useState(false);

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
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
    if (!jobTitle.trim()) {
      toast.error('Job title is required');
      return;
    }
    if (items.length === 0 || !items.some(i => i.description.trim())) {
      toast.error('At least one line item is required');
      return;
    }

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

      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + validDays);

      await addEstimate.mutateAsync({
        estimate: {
          contactId: newContactId,
          leadId,
          estimateNumber: generateEstimateNumber(),
          customerName,
          customerEmail,
          customerPhone,
          customerAddress,
          customerCity,
          customerState,
          customerZip,
          jobTitle,
          jobDescription,
          subtotal,
          taxRate,
          taxAmount,
          totalAmount: total,
          depositRequired,
          depositAmount,
          depositType,
          status: 'draft',
          validUntil,
          notes,
          invoiceGenerated: false,
        },
        items: items.filter(i => i.description.trim()),
      });

      toast.success('Estimate created successfully');
      navigate('/estimates');
    } catch (error: any) {
      toast.error('Failed to create estimate: ' + error.message);
    }
  };

  return (
    <CRMLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/estimates')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Create Estimate</h1>
            <p className="text-muted-foreground">Create a new estimate for a customer</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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

          {/* Job Details */}
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
                  placeholder="Describe the work to be done..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

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
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                  <Label htmlFor="validDays">Valid For (days)</Label>
                  <Select value={validDays.toString()} onValueChange={(v) => setValidDays(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="45">45 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="depositRequired"
                  checked={depositRequired}
                  onCheckedChange={setDepositRequired}
                />
                <Label htmlFor="depositRequired">Require deposit</Label>
              </div>

              {depositRequired && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="depositAmount">Deposit Amount</Label>
                    <Input
                      id="depositAmount"
                      type="number"
                      min="0"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="depositType">Deposit Type</Label>
                    <Select value={depositType} onValueChange={(v: 'fixed' | 'percentage') => setDepositType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <TotalsSummary
                subtotal={subtotal}
                taxRate={taxRate}
                taxAmount={taxAmount}
                total={total}
                depositRequired={depositRequired}
                depositAmount={depositAmount}
                depositType={depositType}
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
            <Button type="button" variant="outline" onClick={() => navigate('/estimates')}>
              Cancel
            </Button>
            <Button type="submit" disabled={addEstimate.isPending}>
              {addEstimate.isPending ? 'Creating...' : 'Create Estimate'}
            </Button>
          </div>
        </form>
      </div>
    </CRMLayout>
  );
};

export default CreateEstimate;
