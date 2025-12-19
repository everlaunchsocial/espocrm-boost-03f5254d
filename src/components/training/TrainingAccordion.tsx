import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Target, AlertTriangle, PhoneCall, MapPin } from 'lucide-react';

interface AccordionSection {
  id: string;
  title: string;
  icon: React.ElementType;
  items: string[];
}

interface TrainingAccordionProps {
  whyPriority: string[];
  painPoints: string[];
  whyPhoneAiFits: string[];
  whereToFind: string[];
}

export function TrainingAccordion({
  whyPriority,
  painPoints,
  whyPhoneAiFits,
  whereToFind,
}: TrainingAccordionProps) {
  const sections: AccordionSection[] = [
    {
      id: 'why-priority',
      title: 'Why This Industry Is a Priority',
      icon: Target,
      items: whyPriority,
    },
    {
      id: 'pain-points',
      title: 'Core Pain Points',
      icon: AlertTriangle,
      items: painPoints,
    },
    {
      id: 'why-fits',
      title: 'Why Phone AI Fits',
      icon: PhoneCall,
      items: whyPhoneAiFits,
    },
    {
      id: 'where-find',
      title: 'Where to Find These Businesses',
      icon: MapPin,
      items: whereToFind,
    },
  ];

  return (
    <Accordion type="multiple" className="w-full">
      {sections.map((section) => {
        const Icon = section.icon;
        
        return (
          <AccordionItem key={section.id} value={section.id}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-primary shrink-0" />
                <span className="text-left font-medium">{section.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {section.items.length > 0 ? (
                <ul className="space-y-2 pl-8">
                  {section.items.map((item, index) => (
                    <li 
                      key={index} 
                      className="text-muted-foreground relative before:content-['•'] before:absolute before:-left-4 before:text-primary"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground pl-8 italic">
                  No content available for this section.
                </p>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
