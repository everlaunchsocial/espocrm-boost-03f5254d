import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface IndustryOption {
  value: string;
  label: string;
  group: string;
}

export const INDUSTRY_OPTIONS: IndustryOption[] = [
  // Home Services
  { value: 'plumbing', label: 'Plumbing', group: 'Home Services' },
  { value: 'hvac', label: 'HVAC', group: 'Home Services' },
  { value: 'electrical', label: 'Electrical', group: 'Home Services' },
  { value: 'roofing', label: 'Roofing', group: 'Home Services' },
  { value: 'locksmith', label: 'Locksmith', group: 'Home Services' },
  { value: 'garage-door', label: 'Garage Door', group: 'Home Services' },
  { value: 'pest-control', label: 'Pest Control', group: 'Home Services' },
  { value: 'landscaping', label: 'Landscaping', group: 'Home Services' },
  { value: 'pool-services', label: 'Pool Services', group: 'Home Services' },
  { value: 'cleaning', label: 'Cleaning Services', group: 'Home Services' },
  { value: 'moving', label: 'Moving Services', group: 'Home Services' },
  { value: 'home-improvement', label: 'General Home Improvement', group: 'Home Services' },
  { value: 'water-damage', label: 'Water Damage/Restoration', group: 'Home Services' },
  { value: 'flooring', label: 'Flooring', group: 'Home Services' },
  { value: 'painting', label: 'Painting', group: 'Home Services' },
  { value: 'fencing', label: 'Fencing', group: 'Home Services' },
  { value: 'appliance-repair', label: 'Appliance Repair', group: 'Home Services' },
  { value: 'tree-services', label: 'Tree Services', group: 'Home Services' },
  { value: 'pressure-washing', label: 'Pressure Washing', group: 'Home Services' },
  { value: 'solar', label: 'Solar Installation', group: 'Home Services' },
  
  // Automotive
  { value: 'towing', label: 'Towing', group: 'Automotive' },
  { value: 'auto-repair', label: 'Auto Repair', group: 'Automotive' },
  { value: 'auto-detailing', label: 'Auto Detailing', group: 'Automotive' },
  { value: 'mobile-mechanic', label: 'Mobile Mechanic', group: 'Automotive' },
  { value: 'transmission', label: 'Transmission Repair', group: 'Automotive' },
  { value: 'auto-body', label: 'Auto Body', group: 'Automotive' },
  { value: 'tire-shop', label: 'Tire Shop', group: 'Automotive' },
  
  // Medical/Health
  { value: 'med-spa', label: 'Medical Spa', group: 'Medical' },
  { value: 'dentist', label: 'Dental Practice', group: 'Medical' },
  { value: 'chiropractor', label: 'Chiropractor', group: 'Medical' },
  { value: 'veterinary', label: 'Veterinary', group: 'Medical' },
  { value: 'physical-therapy', label: 'Physical Therapy', group: 'Medical' },
  { value: 'mental-health', label: 'Mental Health', group: 'Medical' },
  { value: 'urgent-care', label: 'Urgent Care', group: 'Medical' },
  { value: 'dermatology', label: 'Dermatology', group: 'Medical' },
  { value: 'optometry', label: 'Optometry', group: 'Medical' },
  { value: 'home-healthcare', label: 'Home Healthcare', group: 'Medical' },
  
  // Legal
  { value: 'legal-pi', label: 'Personal Injury Law', group: 'Legal' },
  { value: 'legal-bail', label: 'Bail Bonds', group: 'Legal' },
  { value: 'legal-family', label: 'Family Law', group: 'Legal' },
  { value: 'legal-criminal', label: 'Criminal Defense', group: 'Legal' },
  { value: 'legal-estate', label: 'Estate Planning', group: 'Legal' },
  { value: 'legal-immigration', label: 'Immigration Law', group: 'Legal' },
  { value: 'legal-bankruptcy', label: 'Bankruptcy', group: 'Legal' },
  { value: 'legal-general', label: 'General Legal', group: 'Legal' },
  
  // Professional Services
  { value: 'real-estate', label: 'Real Estate', group: 'Professional' },
  { value: 'insurance', label: 'Insurance', group: 'Professional' },
  { value: 'accounting', label: 'Accounting/Tax', group: 'Professional' },
  { value: 'financial-advisor', label: 'Financial Advisor', group: 'Professional' },
  { value: 'mortgage', label: 'Mortgage Broker', group: 'Professional' },
  { value: 'property-management', label: 'Property Management', group: 'Professional' },
  
  // Personal Services
  { value: 'hair-salon', label: 'Hair Salon', group: 'Personal Services' },
  { value: 'barber', label: 'Barber Shop', group: 'Personal Services' },
  { value: 'nail-salon', label: 'Nail Salon', group: 'Personal Services' },
  { value: 'tattoo', label: 'Tattoo Studio', group: 'Personal Services' },
  { value: 'fitness', label: 'Fitness Studio', group: 'Personal Services' },
  { value: 'photography', label: 'Photography', group: 'Personal Services' },
  { value: 'wedding', label: 'Wedding Services', group: 'Personal Services' },
  
  // Other
  { value: 'network-marketing', label: 'Network Marketing', group: 'Other' },
  { value: 'funeral', label: 'Funeral Home', group: 'Other' },
  { value: 'pet-services', label: 'Pet Services', group: 'Other' },
  { value: 'it-support', label: 'IT Support', group: 'Other' },
  { value: 'staffing', label: 'Staffing Agency', group: 'Other' },
  { value: 'other', label: 'Other (specify below)', group: 'Other' },
];

// Group options by their group property
const groupedOptions = INDUSTRY_OPTIONS.reduce((acc, option) => {
  if (!acc[option.group]) {
    acc[option.group] = [];
  }
  acc[option.group].push(option);
  return acc;
}, {} as Record<string, IndustryOption[]>);

const GROUP_ORDER = ['Home Services', 'Automotive', 'Medical', 'Legal', 'Professional', 'Personal Services', 'Other'];

interface IndustryComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function IndustryCombobox({
  value,
  onChange,
  placeholder = "Select industry...",
  disabled = false,
}: IndustryComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selectedOption = INDUSTRY_OPTIONS.find((opt) => opt.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          {selectedOption ? selectedOption.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Type to search..." />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>No industry found.</CommandEmpty>
            {GROUP_ORDER.map((group) => (
              <CommandGroup key={group} heading={group}>
                {groupedOptions[group]?.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
