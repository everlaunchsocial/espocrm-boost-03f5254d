export type ContactStatus = 
  | 'client'
  | 'lead' 
  | 'not-interested'
  | 'left-voicemail'
  | 'sent-email'
  | 'contact-later'
  | 'contacted'
  | 'appointment-set';

// Generic email recipient type for sending emails to both Contacts and Leads
export interface EmailRecipient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  title?: string;
  company?: string;  // For leads
  accountName?: string;  // For contacts
  entityType: 'contact' | 'lead';
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;           // Business phone
  cellPhone?: string;      // Cell phone
  accountId?: string;
  accountName?: string;
  title?: string;
  
  // Secondary contact
  secondaryContactName?: string;
  secondaryContactEmail?: string;
  secondaryContactPhone?: string;
  
  status: ContactStatus;
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
  companyEmail?: string;   // General inbox like info@company.com
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  type: 'customer' | 'partner' | 'prospect';
  createdAt: Date;
  updatedAt: Date;
}

export type LeadPipelineStatus = 
  | 'new_lead'
  | 'contact_attempted'
  | 'demo_created'
  | 'demo_sent'
  | 'demo_engaged'
  | 'ready_to_buy'
  | 'customer_won'
  | 'lost_closed';

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  source: 'web' | 'referral' | 'campaign' | 'social' | 'google-leads' | 'other';
  status: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted';
  pipelineStatus: LeadPipelineStatus;
  // Address fields
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  // Business fields
  website?: string;
  serviceCategory?: string;
  industry?: string;
  // Social media
  facebookUrl?: string;
  instagramHandle?: string;
  // Metrics
  googleRating?: number;
  googleReviewCount?: number;
  // Google enrichment
  googleEnrichedAt?: Date;
  googlePlaceId?: string;
  googleBusinessStatus?: string;
  googleFormattedAddress?: string;
  googleFormattedPhone?: string;
  // Flags
  hasWebsite?: boolean;
  doneForYou?: boolean; // True = HQ handles follow-ups
  priority?: boolean; // True = marked as priority lead
  quietMode?: boolean; // True = suppress AI suggestions
  // Assignment
  assignedToUserId?: string | null;
  notes?: string;
  // Import tracking
  importBatchId?: string;
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
  type: 'call' | 'email' | 'meeting' | 'note' | 'task' | 'status-change' | 'followup';
  subject: string;
  description?: string;
  relatedTo?: {
    type: 'contact' | 'account' | 'lead' | 'deal';
    id: string;
    name: string;
  };
  createdAt: Date;
  isSystemGenerated?: boolean; // True for auto-tracked changes
}

// Notes - manual entries by the user
export interface Note {
  id: string;
  content: string;
  relatedTo: {
    type: 'contact' | 'account' | 'lead' | 'deal';
    id: string;
    name: string;
  };
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
