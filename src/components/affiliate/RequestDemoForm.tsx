import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, CheckCircle, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const formSchema = z.object({
  businessName: z.string().min(1, 'Business name is required').max(100),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Please enter a valid email').max(255),
  phone: z.string().min(7, 'Please enter a valid phone number').max(20),
  websiteUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
});

type FormData = z.infer<typeof formSchema>;

interface RequestDemoFormProps {
  affiliateId: string;
  affiliateUsername: string;
}

export function RequestDemoForm({ affiliateId, affiliateUsername }: RequestDemoFormProps) {
  const [formData, setFormData] = useState<FormData>({
    businessName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    websiteUrl: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [submitError, setSubmitError] = useState('');

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    setSubmitError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    // Validate form
    const result = formSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof FormData, string>> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof FormData;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('request-demo', {
        body: {
          affiliateId,
          affiliateUsername,
          businessName: formData.businessName,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          websiteUrl: formData.websiteUrl || undefined,
        },
      });

      if (error) {
        console.error('Request demo error:', error);
        setSubmitError('Something went wrong. Please try again.');
        return;
      }

      if (!data?.success) {
        setSubmitError(data?.error || 'Something went wrong. Please try again.');
        return;
      }

      setSubmittedEmail(formData.email);
      setIsSuccess(true);
    } catch (err) {
      console.error('Unexpected error:', err);
      setSubmitError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <Card className="border-primary/20 bg-card">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Your Demo is Being Created!</h3>
          <p className="text-muted-foreground mb-4">
            Check your inbox at <span className="font-medium text-foreground">{submittedEmail}</span> for your personalized demo link.
          </p>
          <p className="text-sm text-muted-foreground">
            You'll be able to try our AI chat and voice assistants customized for your business.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-card">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <CardTitle className="text-xl">Request Your Personalized Demo</CardTitle>
        <CardDescription>
          See how AI can transform your customer engagement
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name *</Label>
            <Input
              id="businessName"
              value={formData.businessName}
              onChange={(e) => handleChange('businessName', e.target.value)}
              placeholder="Acme Services"
              className={errors.businessName ? 'border-destructive' : ''}
            />
            {errors.businessName && (
              <p className="text-sm text-destructive">{errors.businessName}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="John"
                className={errors.firstName ? 'border-destructive' : ''}
              />
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Smith"
                className={errors.lastName ? 'border-destructive' : ''}
              />
              {errors.lastName && (
                <p className="text-sm text-destructive">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="john@acmeservices.com"
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Mobile Phone *</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="(555) 123-4567"
              className={errors.phone ? 'border-destructive' : ''}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="websiteUrl">Website URL (optional)</Label>
            <Input
              id="websiteUrl"
              type="url"
              value={formData.websiteUrl}
              onChange={(e) => handleChange('websiteUrl', e.target.value)}
              placeholder="https://www.yourbusiness.com"
              className={errors.websiteUrl ? 'border-destructive' : ''}
            />
            {errors.websiteUrl && (
              <p className="text-sm text-destructive">{errors.websiteUrl}</p>
            )}
            <p className="text-xs text-muted-foreground">
              We'll use your website to personalize your AI demo
            </p>
          </div>

          {submitError && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">{submitError}</p>
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Your Demo...
              </>
            ) : (
              'Get My Personalized Demo'
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            You'll receive a link to your personalized voice + chat demo by email
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
