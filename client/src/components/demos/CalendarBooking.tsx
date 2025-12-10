import { useState } from 'react';
import { format, addDays, isSameDay, isAfter, startOfToday } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarIcon, Clock, Check, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CalendarBookingProps {
  demoId: string;
  businessName: string;
  onBookingComplete?: () => void;
}

// Available time slots (9 AM to 5 PM, every 30 minutes)
const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00'
];

const formatTimeSlot = (time: string): string => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
};

type BookingStep = 'calendar' | 'time' | 'form' | 'success';

export function CalendarBooking({ demoId, businessName, onBookingComplete }: CalendarBookingProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<BookingStep>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const today = startOfToday();
  const maxDate = addDays(today, 30); // Allow booking up to 30 days out

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      setStep('time');
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep('form');
  };

  const handleBack = () => {
    if (step === 'time') {
      setStep('calendar');
      setSelectedTime(undefined);
    } else if (step === 'form') {
      setStep('time');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTime || !name || !email) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Call edge function to create booking and send confirmation emails
      const { data, error } = await supabase.functions.invoke('create-booking', {
        body: {
          demoId,
          prospectName: name,
          prospectEmail: email,
          prospectPhone: phone,
          bookingDate: format(selectedDate, 'yyyy-MM-dd'),
          bookingTime: selectedTime,
          notes,
          businessName,
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to create booking');
      }

      setStep('success');
      onBookingComplete?.();
      
      toast({
        title: 'Booking confirmed!',
        description: 'Check your email for confirmation details.',
      });
    } catch (error) {
      console.error('Booking error:', error);
      toast({
        title: 'Booking failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="text-center py-6 space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
          <Check className="h-6 w-6 text-green-500" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Booking Confirmed!</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedDate && selectedTime && (
              <>
                {format(selectedDate, 'EEEE, MMMM d, yyyy')} at {formatTimeSlot(selectedTime)}
              </>
            )}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          We've sent confirmation details to your email.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <span className={cn('font-medium', step === 'calendar' && 'text-primary')}>Date</span>
        <span>→</span>
        <span className={cn('font-medium', step === 'time' && 'text-primary')}>Time</span>
        <span>→</span>
        <span className={cn('font-medium', step === 'form' && 'text-primary')}>Details</span>
      </div>

      {step === 'calendar' && (
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={(date) => 
              !isAfter(date, addDays(today, -1)) || 
              isAfter(date, maxDate) ||
              date.getDay() === 0 || // Sunday
              date.getDay() === 6    // Saturday
            }
            className="rounded-md border pointer-events-auto"
            initialFocus
          />
        </div>
      )}

      {step === 'time' && selectedDate && (
        <div className="space-y-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          
          <div className="text-center mb-4">
            <p className="text-sm font-medium">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          
          <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {TIME_SLOTS.map((time) => (
              <Button
                key={time}
                variant={selectedTime === time ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleTimeSelect(time)}
                className="text-xs"
              >
                {formatTimeSlot(time)}
              </Button>
            ))}
          </div>
        </div>
      )}

      {step === 'form' && selectedDate && selectedTime && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          
          <div className="text-center mb-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                {format(selectedDate, 'MMM d, yyyy')}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {formatTimeSlot(selectedTime)}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
            
            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything you'd like us to know..."
                rows={2}
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={isSubmitting || !name || !email}
          >
            {isSubmitting ? 'Confirming...' : 'Confirm Booking'}
          </Button>
        </form>
      )}
    </div>
  );
}
