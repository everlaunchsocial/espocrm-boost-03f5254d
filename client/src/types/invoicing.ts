export interface Estimate {
  id: string;
  contactId?: string;
  leadId?: string;
  estimateNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerCity?: string;
  customerState?: string;
  customerZip?: string;
  jobTitle: string;
  jobDescription?: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  depositRequired: boolean;
  depositAmount: number;
  depositType: 'fixed' | 'percentage';
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired';
  validUntil?: Date;
  sentAt?: Date;
  viewedAt?: Date;
  acceptedAt?: Date;
  declinedAt?: Date;
  signatureData?: string;
  signerName?: string;
  signerIp?: string;
  beforePhotoUrl?: string;
  duringPhotoUrl?: string;
  afterPhotoUrl?: string;
  notes?: string;
  termsAndConditions?: string;
  invoiceGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
  items?: EstimateItem[];
}

export interface EstimateItem {
  id: string;
  estimateId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  sortOrder: number;
}

export interface Invoice {
  id: string;
  contactId?: string;
  leadId?: string;
  estimateId?: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerCity?: string;
  customerState?: string;
  customerZip?: string;
  jobTitle: string;
  jobDescription?: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  status: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue';
  dueDate?: Date;
  paidDate?: Date;
  sentAt?: Date;
  viewedAt?: Date;
  beforePhotoUrl?: string;
  duringPhotoUrl?: string;
  afterPhotoUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  sortOrder: number;
  discountType?: 'percentage' | 'fixed';
  discountAmount?: number;
}

export interface LineItemInput {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountType?: 'percentage' | 'fixed';
  discountAmount?: number;
}
