import { useState } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useContacts, useLeads } from '@/hooks/useCRMData';

interface CustomerSelectorProps {
  onSelect: (customer: {
    type: 'contact' | 'lead' | 'new';
    id?: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  }) => void;
  value?: string;
}

export const CustomerSelector = ({ onSelect, value }: CustomerSelectorProps) => {
  const [open, setOpen] = useState(false);
  const { data: contacts = [] } = useContacts();
  const { data: leads = [] } = useLeads();

  const handleSelect = (type: 'contact' | 'lead', id: string) => {
    if (type === 'contact') {
      const contact = contacts.find((c) => c.id === id);
      if (contact) {
        onSelect({
          type: 'contact',
          id: contact.id,
          name: `${contact.firstName} ${contact.lastName}`,
          email: contact.email,
          phone: contact.phone,
        });
      }
    } else {
      const lead = leads.find((l) => l.id === id);
      if (lead) {
        onSelect({
          type: 'lead',
          id: lead.id,
          name: lead.company || `${lead.firstName} ${lead.lastName}`,
          email: lead.email,
          phone: lead.phone,
          address: lead.address,
          city: lead.city,
          state: lead.state,
          zip: lead.zipCode,
        });
      }
    }
    setOpen(false);
  };

  const handleNewCustomer = () => {
    onSelect({ type: 'new', name: '' });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value || 'Select existing customer...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search contacts and leads..." />
          <CommandList>
            <CommandEmpty>No customer found.</CommandEmpty>
            
            <CommandGroup heading="Quick Actions">
              <CommandItem onSelect={handleNewCustomer}>
                <Plus className="mr-2 h-4 w-4" />
                Enter new customer details
              </CommandItem>
            </CommandGroup>
            
            {contacts.length > 0 && (
              <CommandGroup heading="Contacts">
                {contacts.map((contact) => (
                  <CommandItem
                    key={contact.id}
                    onSelect={() => handleSelect('contact', contact.id)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === `${contact.firstName} ${contact.lastName}` ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{contact.firstName} {contact.lastName}</span>
                      {contact.accountName && (
                        <span className="text-xs text-muted-foreground">{contact.accountName}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            
            {leads.length > 0 && (
              <CommandGroup heading="Leads">
                {leads.map((lead) => (
                  <CommandItem
                    key={lead.id}
                    onSelect={() => handleSelect('lead', lead.id)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === (lead.company || `${lead.firstName} ${lead.lastName}`) ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{lead.company || `${lead.firstName} ${lead.lastName}`}</span>
                      {lead.company && (
                        <span className="text-xs text-muted-foreground">
                          {lead.firstName} {lead.lastName}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
