import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Building2, Shield, Bell, Loader2 } from 'lucide-react';

// Account Information Schema
const accountInfoSchema = z.object({
  business_name: z.string().min(1, 'Business name is required').max(100),
  industry: z.string().max(100).optional(),
  street_address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zip_code: z.string().max(20).optional(),
  business_phone: z.string().max(20).optional(),
  website_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  contact_name: z.string().min(1, 'Your name is required').max(100),
  contact_email: z.string().email('Must be a valid email').optional().or(z.literal('')),
  contact_phone: z.string().max(20).optional(),
});

// Password Schema
const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// Email Change Schema
const emailChangeSchema = z.object({
  newEmail: z.string().email('Must be a valid email'),
  currentPassword: z.string().min(1, 'Current password is required for verification'),
});

// Notification Preferences Schema
const notificationSchema = z.object({
  email_new_leads: z.boolean(),
  email_missed_calls: z.boolean(),
  email_voicemail_transcripts: z.boolean(),
  email_weekly_summary: z.boolean(),
  email_billing: z.boolean(),
  sms_urgent_missed_calls: z.boolean(),
  sms_new_leads_realtime: z.boolean(),
});

type AccountInfoFormData = z.infer<typeof accountInfoSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;
type EmailChangeFormData = z.infer<typeof emailChangeSchema>;
type NotificationFormData = z.infer<typeof notificationSchema>;

export default function CustomerAccountSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);

  const accountForm = useForm<AccountInfoFormData>({
    resolver: zodResolver(accountInfoSchema),
    defaultValues: {
      business_name: '',
      industry: '',
      street_address: '',
      city: '',
      state: '',
      zip_code: '',
      business_phone: '',
      website_url: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const emailForm = useForm<EmailChangeFormData>({
    resolver: zodResolver(emailChangeSchema),
    defaultValues: {
      newEmail: '',
      currentPassword: '',
    },
  });

  const notificationForm = useForm<NotificationFormData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      email_new_leads: true,
      email_missed_calls: true,
      email_voicemail_transcripts: true,
      email_weekly_summary: true,
      email_billing: true,
      sms_urgent_missed_calls: false,
      sms_new_leads_realtime: false,
    },
  });

  // Load customer data
  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setUserEmail(user.email || '');

        // Get customer profile
        const { data: profile, error: profileError } = await supabase
          .from('customer_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profileError) throw profileError;
        if (!profile) return;

        setCustomerId(profile.id);

        // Set account form values
        accountForm.reset({
          business_name: profile.business_name || '',
          industry: profile.industry || '',
          street_address: profile.street_address || '',
          city: profile.city || '',
          state: profile.state || '',
          zip_code: profile.zip_code || '',
          business_phone: profile.business_phone || '',
          website_url: profile.website_url || '',
          contact_name: profile.contact_name || '',
          contact_email: profile.contact_email || user.email || '',
          contact_phone: profile.contact_phone || profile.phone || '',
        });

        // Get notification preferences
        const { data: notifPrefs } = await supabase
          .from('customer_notification_preferences')
          .select('*')
          .eq('customer_id', profile.id)
          .single();

        if (notifPrefs) {
          notificationForm.reset({
            email_new_leads: notifPrefs.email_new_leads ?? true,
            email_missed_calls: notifPrefs.email_missed_calls ?? true,
            email_voicemail_transcripts: notifPrefs.email_voicemail_transcripts ?? true,
            email_weekly_summary: notifPrefs.email_weekly_summary ?? true,
            email_billing: notifPrefs.email_billing ?? true,
            sms_urgent_missed_calls: notifPrefs.sms_urgent_missed_calls ?? false,
            sms_new_leads_realtime: notifPrefs.sms_new_leads_realtime ?? false,
          });
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load account settings');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Save account information
  const onSaveAccount = async (data: AccountInfoFormData) => {
    if (!customerId) return;
    setSavingAccount(true);

    try {
      const { error } = await supabase
        .from('customer_profiles')
        .update({
          business_name: data.business_name,
          industry: data.industry || null,
          street_address: data.street_address || null,
          city: data.city || null,
          state: data.state || null,
          zip_code: data.zip_code || null,
          business_phone: data.business_phone || null,
          website_url: data.website_url || null,
          contact_name: data.contact_name,
          contact_email: data.contact_email || null,
          contact_phone: data.contact_phone || null,
          settings_updated_at: new Date().toISOString(),
        })
        .eq('id', customerId);

      if (error) throw error;
      toast.success('Account information saved successfully');
    } catch (error) {
      console.error('Error saving account info:', error);
      toast.error('Failed to save account information');
    } finally {
      setSavingAccount(false);
    }
  };

  // Change password
  const onChangePassword = async (data: PasswordFormData) => {
    setSavingPassword(true);

    try {
      // Verify current password by re-authenticating
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: data.currentPassword,
      });

      if (signInError) {
        toast.error('Current password is incorrect');
        return;
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (error) throw error;
      
      passwordForm.reset();
      toast.success('Password updated successfully');
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  // Change email
  const onChangeEmail = async (data: EmailChangeFormData) => {
    setSavingEmail(true);

    try {
      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: data.currentPassword,
      });

      if (signInError) {
        toast.error('Current password is incorrect');
        return;
      }

      // Update email (Supabase will send verification email)
      const { error } = await supabase.auth.updateUser({
        email: data.newEmail,
      });

      if (error) throw error;

      // Also update customer_profiles
      if (customerId) {
        await supabase
          .from('customer_profiles')
          .update({ contact_email: data.newEmail })
          .eq('id', customerId);
      }

      emailForm.reset();
      toast.success('Verification email sent to ' + data.newEmail + '. Please check your inbox.');
    } catch (error) {
      console.error('Error changing email:', error);
      toast.error('Failed to update email');
    } finally {
      setSavingEmail(false);
    }
  };

  // Save notification preferences
  const onSaveNotifications = async (data: NotificationFormData) => {
    if (!customerId) return;
    setSavingNotifications(true);

    try {
      // Upsert notification preferences
      const { error } = await supabase
        .from('customer_notification_preferences')
        .upsert({
          customer_id: customerId,
          ...data,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'customer_id',
        });

      if (error) throw error;
      toast.success('Notification preferences saved successfully');
    } catch (error) {
      console.error('Error saving notifications:', error);
      toast.error('Failed to save notification preferences');
    } finally {
      setSavingNotifications(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your account information, security, and notification preferences
          </p>
        </div>

        <Tabs defaultValue="account" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="account" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
          </TabsList>

          {/* Account Information Tab */}
          <TabsContent value="account" className="space-y-6">
            <Form {...accountForm}>
              <form onSubmit={accountForm.handleSubmit(onSaveAccount)} className="space-y-6">
                {/* Business Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Business Details</CardTitle>
                    <CardDescription>Information about your business</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={accountForm.control}
                      name="business_name"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Business Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Your Business Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={accountForm.control}
                      name="industry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Industry</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., HVAC, Plumbing" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={accountForm.control}
                      name="website_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://yourbusiness.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={accountForm.control}
                      name="street_address"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Street Address</FormLabel>
                          <FormControl>
                            <Input placeholder="123 Main St" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={accountForm.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="City" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={accountForm.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input placeholder="CA" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={accountForm.control}
                        name="zip_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Zip Code</FormLabel>
                            <FormControl>
                              <Input placeholder="90210" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={accountForm.control}
                      name="business_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                    <CardDescription>Your personal contact details</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={accountForm.control}
                      name="contact_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={accountForm.control}
                      name="contact_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="you@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={accountForm.control}
                      name="contact_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Cell Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 987-6543" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button type="submit" disabled={savingAccount}>
                    {savingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            {/* Change Password */}
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password *</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password *</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-muted-foreground">
                            Min 8 characters, at least one number, uppercase and lowercase letter
                          </p>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password *</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={savingPassword}>
                      {savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Update Password
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Change Email */}
            <Card>
              <CardHeader>
                <CardTitle>Change Email</CardTitle>
                <CardDescription>
                  Update your login email address. Current: <span className="font-medium">{userEmail}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...emailForm}>
                  <form onSubmit={emailForm.handleSubmit(onChangeEmail)} className="space-y-4">
                    <FormField
                      control={emailForm.control}
                      name="newEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Email Address *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="newemail@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={emailForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password *</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-muted-foreground">
                            Required for verification
                          </p>
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={savingEmail}>
                      {savingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Update Email
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Form {...notificationForm}>
              <form onSubmit={notificationForm.handleSubmit(onSaveNotifications)} className="space-y-6">
                {/* Email Notifications */}
                <Card>
                  <CardHeader>
                    <CardTitle>Email Notifications</CardTitle>
                    <CardDescription>Choose what emails you want to receive</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={notificationForm.control}
                      name="email_new_leads"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="!mt-0 cursor-pointer">New leads captured</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={notificationForm.control}
                      name="email_missed_calls"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="!mt-0 cursor-pointer">Missed calls</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={notificationForm.control}
                      name="email_voicemail_transcripts"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="!mt-0 cursor-pointer">Voicemail transcripts</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={notificationForm.control}
                      name="email_weekly_summary"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="!mt-0 cursor-pointer">Weekly summary reports</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={notificationForm.control}
                      name="email_billing"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="!mt-0 cursor-pointer">Billing notifications</FormLabel>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* SMS Notifications */}
                <Card>
                  <CardHeader>
                    <CardTitle>SMS Notifications</CardTitle>
                    <CardDescription>Choose what SMS alerts you want to receive</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={notificationForm.control}
                      name="sms_urgent_missed_calls"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="!mt-0 cursor-pointer">Urgent missed calls</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={notificationForm.control}
                      name="sms_new_leads_realtime"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="!mt-0 cursor-pointer">New leads (real-time)</FormLabel>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button type="submit" disabled={savingNotifications}>
                    {savingNotifications && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Notification Preferences
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}