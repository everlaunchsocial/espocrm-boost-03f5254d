import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Contact, Account, Lead, Deal, Task, Activity, ContactStatus } from '@/types/crm';

interface CRMStore {
  contacts: Contact[];
  accounts: Account[];
  leads: Lead[];
  deals: Deal[];
  tasks: Task[];
  activities: Activity[];
  
  // Contact actions
  addContact: (contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateContact: (id: string, contact: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  
  // Account actions
  addAccount: (account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateAccount: (id: string, account: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  
  // Lead actions
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateLead: (id: string, lead: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  convertLeadToContact: (leadId: string) => void;
  
  // Deal actions
  addDeal: (deal: Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateDeal: (id: string, deal: Partial<Deal>) => void;
  deleteDeal: (id: string) => void;
  
  // Task actions
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTask: (id: string, task: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  
  // Activity actions
  addActivity: (activity: Omit<Activity, 'id' | 'createdAt'>) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

// Sample data with enhanced contact and account fields
const sampleContacts: Contact[] = [
  { 
    id: '1', 
    firstName: 'John', 
    lastName: 'Smith', 
    email: 'john.smith@acme.com', 
    phone: '+1 555-0101', 
    cellPhone: '+1 555-0111',
    accountId: '1', 
    accountName: 'Acme Corp', 
    title: 'CEO', 
    status: 'client',
    secondaryContactName: 'Jane Smith',
    secondaryContactEmail: 'jane.smith@acme.com',
    secondaryContactPhone: '+1 555-0112',
    createdAt: new Date('2024-01-15'), 
    updatedAt: new Date('2024-01-15') 
  },
  { 
    id: '2', 
    firstName: 'Sarah', 
    lastName: 'Johnson', 
    email: 'sarah.j@techstart.io', 
    phone: '+1 555-0102',
    cellPhone: '+1 555-0122',
    accountId: '2', 
    accountName: 'TechStart Inc', 
    title: 'CTO', 
    status: 'contacted',
    createdAt: new Date('2024-02-10'), 
    updatedAt: new Date('2024-02-10') 
  },
  { 
    id: '3', 
    firstName: 'Michael', 
    lastName: 'Brown', 
    email: 'michael.b@globaltech.com', 
    phone: '+1 555-0103',
    accountId: '3', 
    accountName: 'GlobalTech', 
    title: 'VP Sales', 
    status: 'lead',
    createdAt: new Date('2024-03-05'), 
    updatedAt: new Date('2024-03-05') 
  },
];

const sampleAccounts: Account[] = [
  { 
    id: '1', 
    name: 'Acme Corp', 
    website: 'https://acme.com', 
    industry: 'Technology', 
    phone: '+1 555-1000', 
    email: 'info@acme.com',
    companyEmail: 'info@acme.com',
    address: '123 Main St', 
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102',
    country: 'USA', 
    type: 'customer', 
    createdAt: new Date('2024-01-10'), 
    updatedAt: new Date('2024-01-10') 
  },
  { 
    id: '2', 
    name: 'TechStart Inc', 
    website: 'https://techstart.io', 
    industry: 'Software', 
    phone: '+1 555-2000', 
    email: 'hello@techstart.io',
    companyEmail: 'hello@techstart.io',
    address: '456 Tech Ave', 
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
    country: 'USA', 
    type: 'prospect', 
    createdAt: new Date('2024-02-05'), 
    updatedAt: new Date('2024-02-05') 
  },
  { 
    id: '3', 
    name: 'GlobalTech', 
    website: 'https://globaltech.com', 
    industry: 'Consulting', 
    phone: '+1 555-3000', 
    email: 'contact@globaltech.com',
    companyEmail: 'contact@globaltech.com',
    address: '789 Global Blvd', 
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    country: 'USA', 
    type: 'partner', 
    createdAt: new Date('2024-03-01'), 
    updatedAt: new Date('2024-03-01') 
  },
];

const sampleLeads: Lead[] = [
  { id: '1', firstName: 'Emily', lastName: 'Davis', email: 'emily.d@startup.co', phone: '+1 555-0201', company: 'StartupCo', title: 'Founder', source: 'web', status: 'new', createdAt: new Date('2024-11-20'), updatedAt: new Date('2024-11-20') },
  { id: '2', firstName: 'James', lastName: 'Wilson', email: 'james.w@enterprise.com', phone: '+1 555-0202', company: 'Enterprise Ltd', title: 'Director', source: 'referral', status: 'contacted', createdAt: new Date('2024-11-18'), updatedAt: new Date('2024-11-22') },
  { id: '3', firstName: 'Lisa', lastName: 'Anderson', email: 'lisa.a@growth.io', phone: '+1 555-0203', company: 'GrowthIO', title: 'Head of Ops', source: 'campaign', status: 'qualified', createdAt: new Date('2024-11-15'), updatedAt: new Date('2024-11-25') },
];

const sampleDeals: Deal[] = [
  { id: '1', name: 'Acme Enterprise License', accountId: '1', accountName: 'Acme Corp', contactId: '1', contactName: 'John Smith', amount: 50000, stage: 'negotiation', probability: 75, expectedCloseDate: new Date('2024-12-31'), createdAt: new Date('2024-10-01'), updatedAt: new Date('2024-11-20') },
  { id: '2', name: 'TechStart Implementation', accountId: '2', accountName: 'TechStart Inc', contactId: '2', contactName: 'Sarah Johnson', amount: 25000, stage: 'proposal', probability: 50, expectedCloseDate: new Date('2025-01-15'), createdAt: new Date('2024-10-15'), updatedAt: new Date('2024-11-18') },
  { id: '3', name: 'GlobalTech Partnership', accountId: '3', accountName: 'GlobalTech', contactId: '3', contactName: 'Michael Brown', amount: 100000, stage: 'qualification', probability: 25, expectedCloseDate: new Date('2025-02-28'), createdAt: new Date('2024-11-01'), updatedAt: new Date('2024-11-15') },
  { id: '4', name: 'Acme Support Contract', accountId: '1', accountName: 'Acme Corp', contactId: '1', contactName: 'John Smith', amount: 12000, stage: 'closed-won', probability: 100, expectedCloseDate: new Date('2024-11-01'), createdAt: new Date('2024-09-01'), updatedAt: new Date('2024-11-01') },
];

const sampleTasks: Task[] = [
  { id: '1', name: 'Follow up with John Smith', description: 'Discuss contract terms', status: 'not-started', priority: 'high', dueDate: new Date('2024-12-05'), relatedTo: { type: 'contact', id: '1', name: 'John Smith' }, createdAt: new Date('2024-11-28'), updatedAt: new Date('2024-11-28') },
  { id: '2', name: 'Prepare proposal for TechStart', description: 'Include pricing and timeline', status: 'in-progress', priority: 'medium', dueDate: new Date('2024-12-10'), relatedTo: { type: 'deal', id: '2', name: 'TechStart Implementation' }, createdAt: new Date('2024-11-25'), updatedAt: new Date('2024-11-30') },
  { id: '3', name: 'Schedule demo with Lisa', description: 'Product demonstration', status: 'completed', priority: 'low', dueDate: new Date('2024-11-30'), relatedTo: { type: 'lead', id: '3', name: 'Lisa Anderson' }, createdAt: new Date('2024-11-20'), updatedAt: new Date('2024-11-30') },
];

const sampleActivities: Activity[] = [
  { id: '1', type: 'call', subject: 'Initial discovery call', description: 'Discussed requirements and budget', relatedTo: { type: 'lead', id: '1', name: 'Emily Davis' }, createdAt: new Date('2024-11-28T10:30:00') },
  { id: '2', type: 'email', subject: 'Sent proposal document', description: 'Attached pricing proposal', relatedTo: { type: 'deal', id: '1', name: 'Acme Enterprise License' }, createdAt: new Date('2024-11-27T14:15:00') },
  { id: '3', type: 'meeting', subject: 'Contract negotiation meeting', description: 'Negotiated final terms', relatedTo: { type: 'account', id: '1', name: 'Acme Corp' }, createdAt: new Date('2024-11-26T09:00:00') },
  { id: '4', type: 'note', subject: 'Customer feedback', description: 'Positive feedback on demo', relatedTo: { type: 'contact', id: '2', name: 'Sarah Johnson' }, createdAt: new Date('2024-11-25T16:45:00') },
];

export const useCRMStore = create<CRMStore>()(
  persist(
    (set, get) => ({
      contacts: sampleContacts,
      accounts: sampleAccounts,
      leads: sampleLeads,
      deals: sampleDeals,
      tasks: sampleTasks,
      activities: sampleActivities,

      // Contact actions
      addContact: (contact) => {
        const newContact: Contact = {
          ...contact,
          id: generateId(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({ contacts: [...state.contacts, newContact] }));
        get().addActivity({
          type: 'note',
          subject: `Contact created: ${contact.firstName} ${contact.lastName}`,
          relatedTo: { type: 'contact', id: newContact.id, name: `${contact.firstName} ${contact.lastName}` },
        });
      },
      updateContact: (id, contact) => set((state) => ({
        contacts: state.contacts.map((c) => c.id === id ? { ...c, ...contact, updatedAt: new Date() } : c),
      })),
      deleteContact: (id) => set((state) => ({
        contacts: state.contacts.filter((c) => c.id !== id),
      })),

      // Account actions
      addAccount: (account) => {
        const newAccount: Account = {
          ...account,
          id: generateId(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({ accounts: [...state.accounts, newAccount] }));
        get().addActivity({
          type: 'note',
          subject: `Account created: ${account.name}`,
          relatedTo: { type: 'account', id: newAccount.id, name: account.name },
        });
      },
      updateAccount: (id, account) => set((state) => ({
        accounts: state.accounts.map((a) => a.id === id ? { ...a, ...account, updatedAt: new Date() } : a),
      })),
      deleteAccount: (id) => set((state) => ({
        accounts: state.accounts.filter((a) => a.id !== id),
      })),

      // Lead actions
      addLead: (lead) => {
        const newLead: Lead = {
          ...lead,
          id: generateId(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({ leads: [...state.leads, newLead] }));
        get().addActivity({
          type: 'note',
          subject: `Lead created: ${lead.firstName} ${lead.lastName}`,
          relatedTo: { type: 'lead', id: newLead.id, name: `${lead.firstName} ${lead.lastName}` },
        });
      },
      updateLead: (id, lead) => set((state) => ({
        leads: state.leads.map((l) => l.id === id ? { ...l, ...lead, updatedAt: new Date() } : l),
      })),
      deleteLead: (id) => set((state) => ({
        leads: state.leads.filter((l) => l.id !== id),
      })),
      convertLeadToContact: (leadId) => {
        const lead = get().leads.find((l) => l.id === leadId);
        if (lead) {
          get().addContact({
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email,
            phone: lead.phone || '',
            title: lead.title,
            status: 'lead',
          });
          get().updateLead(leadId, { status: 'converted' });
        }
      },

      // Deal actions
      addDeal: (deal) => {
        const newDeal: Deal = {
          ...deal,
          id: generateId(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({ deals: [...state.deals, newDeal] }));
        get().addActivity({
          type: 'note',
          subject: `Deal created: ${deal.name}`,
          relatedTo: { type: 'deal', id: newDeal.id, name: deal.name },
        });
      },
      updateDeal: (id, deal) => set((state) => ({
        deals: state.deals.map((d) => d.id === id ? { ...d, ...deal, updatedAt: new Date() } : d),
      })),
      deleteDeal: (id) => set((state) => ({
        deals: state.deals.filter((d) => d.id !== id),
      })),

      // Task actions
      addTask: (task) => {
        const newTask: Task = {
          ...task,
          id: generateId(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({ tasks: [...state.tasks, newTask] }));
      },
      updateTask: (id, task) => set((state) => ({
        tasks: state.tasks.map((t) => t.id === id ? { ...t, ...task, updatedAt: new Date() } : t),
      })),
      deleteTask: (id) => set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
      })),

      // Activity actions
      addActivity: (activity) => set((state) => ({
        activities: [
          {
            ...activity,
            id: generateId(),
            createdAt: new Date(),
          },
          ...state.activities,
        ],
      })),
    }),
    {
      name: 'crm-storage',
    }
  )
);
