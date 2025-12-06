import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, Mail, Phone, MessageSquare, Building2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, addWeeks, subWeeks, isSameMonth, isSameDay, parseISO, isToday } from 'date-fns';

type ViewMode = 'month' | 'week' | 'day';

interface CalendarBooking {
  id: string;
  demo_id: string | null;
  prospect_name: string;
  prospect_email: string;
  prospect_phone: string | null;
  booking_date: string;
  booking_time: string;
  notes: string | null;
  status: string;
  created_at: string;
  demos?: {
    business_name: string;
    website_url: string | null;
  } | null;
}

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedBooking, setSelectedBooking] = useState<CalendarBooking | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Fetch all bookings
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['calendar-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_bookings')
        .select(`
          *,
          demos (
            business_name,
            website_url
          )
        `)
        .order('booking_date', { ascending: true })
        .order('booking_time', { ascending: true });

      if (error) throw error;
      return data as CalendarBooking[];
    },
  });

  // Format time for display
  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Get bookings for a specific date
  const getBookingsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookings.filter(b => b.booking_date === dateStr);
  };

  // Navigation functions
  const goToPrevious = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, -1));
    }
  };

  const goToNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Generate calendar days for month view
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days: Date[] = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentDate]);

  // Generate week days for week view
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i));
    }
    return days;
  }, [currentDate]);

  // Time slots for day/week view
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = 8; hour <= 18; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00:00`);
    }
    return slots;
  }, []);

  // Render month view
  const renderMonthView = () => (
    <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
      {/* Day headers */}
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
        <div key={day} className="bg-muted p-2 text-center text-sm font-medium text-muted-foreground">
          {day}
        </div>
      ))}
      
      {/* Calendar days */}
      {calendarDays.map((day, idx) => {
        const dayBookings = getBookingsForDate(day);
        const isCurrentMonth = isSameMonth(day, currentDate);
        const isCurrentDay = isToday(day);
        
        return (
          <div
            key={idx}
            onClick={() => {
              setSelectedDate(day);
              setViewMode('day');
              setCurrentDate(day);
            }}
            className={`
              min-h-[100px] p-2 bg-background cursor-pointer hover:bg-muted/50 transition-colors
              ${!isCurrentMonth ? 'text-muted-foreground/50' : ''}
            `}
          >
            <div className={`
              text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full
              ${isCurrentDay ? 'bg-primary text-primary-foreground' : ''}
            `}>
              {format(day, 'd')}
            </div>
            <div className="space-y-1">
              {dayBookings.slice(0, 3).map(booking => (
                <button
                  key={booking.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedBooking(booking);
                  }}
                  className="w-full text-left text-xs p-1 bg-primary/10 hover:bg-primary/20 rounded truncate text-primary font-medium"
                >
                  {formatTime(booking.booking_time)} {booking.prospect_name.split(' ')[0]}
                </button>
              ))}
              {dayBookings.length > 3 && (
                <span className="text-xs text-muted-foreground">+{dayBookings.length - 3} more</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // Render week view
  const renderWeekView = () => (
    <div className="border rounded-lg overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-8 bg-muted">
        <div className="p-2 border-r text-sm font-medium text-muted-foreground">Time</div>
        {weekDays.map((day, idx) => (
          <div key={idx} className="p-2 text-center border-r last:border-r-0">
            <div className="text-xs text-muted-foreground">{format(day, 'EEE')}</div>
            <div className={`text-lg font-medium ${isToday(day) ? 'text-primary' : ''}`}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>
      
      {/* Time slots */}
      <div className="max-h-[600px] overflow-y-auto">
        {timeSlots.map(slot => (
          <div key={slot} className="grid grid-cols-8 border-t">
            <div className="p-2 border-r text-xs text-muted-foreground">
              {formatTime(slot)}
            </div>
            {weekDays.map((day, idx) => {
              const slotBookings = getBookingsForDate(day).filter(b => b.booking_time === slot);
              return (
                <div key={idx} className="p-1 border-r last:border-r-0 min-h-[50px]">
                  {slotBookings.map(booking => (
                    <button
                      key={booking.id}
                      onClick={() => setSelectedBooking(booking)}
                      className="w-full text-left text-xs p-1 bg-primary/10 hover:bg-primary/20 rounded truncate text-primary font-medium"
                    >
                      {booking.prospect_name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  // Render day view
  const renderDayView = () => {
    const dayBookings = getBookingsForDate(currentDate);
    
    return (
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted p-4 text-center">
          <div className={`text-2xl font-bold ${isToday(currentDate) ? 'text-primary' : ''}`}>
            {format(currentDate, 'EEEE, MMMM d, yyyy')}
          </div>
        </div>
        
        <div className="max-h-[600px] overflow-y-auto">
          {timeSlots.map(slot => {
            const slotBookings = dayBookings.filter(b => b.booking_time === slot);
            return (
              <div key={slot} className="flex border-t">
                <div className="w-24 p-3 border-r text-sm text-muted-foreground bg-muted/30">
                  {formatTime(slot)}
                </div>
                <div className="flex-1 p-2 min-h-[60px]">
                  {slotBookings.map(booking => (
                    <button
                      key={booking.id}
                      onClick={() => setSelectedBooking(booking)}
                      className="w-full text-left p-3 bg-primary/10 hover:bg-primary/20 rounded-lg border border-primary/20"
                    >
                      <div className="font-medium text-primary">{booking.prospect_name}</div>
                      <div className="text-sm text-muted-foreground">{booking.prospect_email}</div>
                      {booking.demos?.business_name && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Demo: {booking.demos.business_name}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
          <p className="text-muted-foreground">View and manage your booked appointments</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode('month')}
            >
              Month
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none border-x"
              onClick={() => setViewMode('week')}
            >
              Week
            </Button>
            <Button
              variant={viewMode === 'day' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode('day')}
            >
              Day
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={goToPrevious}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-lg">
              {viewMode === 'month' && format(currentDate, 'MMMM yyyy')}
              {viewMode === 'week' && `Week of ${format(startOfWeek(currentDate), 'MMM d, yyyy')}`}
              {viewMode === 'day' && format(currentDate, 'EEEE, MMMM d, yyyy')}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={goToNext}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {viewMode === 'month' && renderMonthView()}
              {viewMode === 'week' && renderWeekView()}
              {viewMode === 'day' && renderDayView()}
            </>
          )}
        </CardContent>
      </Card>

      {/* Upcoming appointments summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Upcoming Appointments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.filter(b => parseISO(b.booking_date) >= new Date()).length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No upcoming appointments</p>
          ) : (
            <div className="space-y-3">
              {bookings
                .filter(b => parseISO(b.booking_date) >= new Date())
                .slice(0, 5)
                .map(booking => (
                  <button
                    key={booking.id}
                    onClick={() => setSelectedBooking(booking)}
                    className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{booking.prospect_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(parseISO(booking.booking_date), 'EEE, MMM d')} at {formatTime(booking.booking_time)}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-primary border-primary">
                        {booking.status}
                      </Badge>
                    </div>
                  </button>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking Detail Dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Appointment Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-4">
              {/* Date/Time */}
              <div className="bg-primary/10 rounded-lg p-4 text-center">
                <div className="text-lg font-semibold text-primary">
                  {format(parseISO(selectedBooking.booking_date), 'EEEE, MMMM d, yyyy')}
                </div>
                <div className="text-2xl font-bold text-primary">
                  {formatTime(selectedBooking.booking_time)}
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-muted">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Name</div>
                    <div className="font-medium">{selectedBooking.prospect_name}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-muted">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Email</div>
                    <a href={`mailto:${selectedBooking.prospect_email}`} className="font-medium text-primary hover:underline">
                      {selectedBooking.prospect_email}
                    </a>
                  </div>
                </div>
                
                {selectedBooking.prospect_phone && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-muted">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Phone</div>
                      <a href={`tel:${selectedBooking.prospect_phone}`} className="font-medium text-primary hover:underline">
                        {selectedBooking.prospect_phone}
                      </a>
                    </div>
                  </div>
                )}

                {selectedBooking.demos?.business_name && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-muted">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Demo For</div>
                      <div className="font-medium">{selectedBooking.demos.business_name}</div>
                    </div>
                  </div>
                )}

                {selectedBooking.notes && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-muted">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Notes</div>
                      <div className="text-sm">{selectedBooking.notes}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant="outline" className="text-primary border-primary capitalize">
                  {selectedBooking.status}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Calendar;
