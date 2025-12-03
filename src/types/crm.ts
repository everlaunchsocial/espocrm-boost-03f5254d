export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  accountId?: string;
  accountName?: string;
  title?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface Account {
  id: string;
  name: string;
  website?: string;
  industry?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  type: 'customer' | 'partner' | 'prospect';
  createdAt: Date;
  updatedAt: Date;
}

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  title?: string;
  source: 'web' | 'referral' | 'campaign' | 'social' | 'other';
  status: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted';
  createdAt: Date;
  updatedAt: Date;
}

export interface Deal {
  id: string;
  name: string;
  accountId?: string;
  accountName?: string;
  contactId?: string;
  contactName?: string;
  amount: number;
  stage: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost';
  probability: number;
  expectedCloseDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  name: string;
  description?: string;
  status: 'not-started' | 'in-progress' | 'completed' | 'deferred';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date;
  assignedTo?: string;
  relatedTo?: {
    type: 'contact' | 'account' | 'lead' | 'deal';
    id: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Activity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'task';
  subject: string;
  description?: string;
  relatedTo?: {
    type: 'contact' | 'account' | 'lead' | 'deal';
    id: string;
    name: string;
  };
  createdAt: Date;
}
