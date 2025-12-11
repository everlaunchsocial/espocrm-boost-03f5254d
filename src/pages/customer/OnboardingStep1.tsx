import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerOnboarding } from '@/hooks/useCustomerOnboarding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Building2, Globe, User, Phone } from 'lucide-react';
import { toast } from 'sonner';

export default function OnboardingStep1() {
  const navigate = useNavigate();
  const { customerProfile, updateProfile, isLoading } = useCustomerOnboarding();
  
  const [businessName, setBusinessName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (customerProfile) {
      setBusinessName(customerProfile.business_name || '');
      setWebsiteUrl(customerProfile.website_url || '');
      setContactName(customerProfile.contact_name || '');
      setPhone(customerProfile.phone || '');
    }
  }, [customerProfile]);

  const formatWebsiteUrl = (url: string) => {
    if (!url) return '';
    url = url.trim();
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  };

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  const validatePhone = (phoneNumber: string) => {
    if (!phoneNumber) return true; // Optional field
    const cleaned = phoneNumber.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  };

  const handleSave = async (showToast = false) => {
    const formattedWebsite = formatWebsiteUrl(websiteUrl);
    
    const success = await updateProfile({
      business_name: businessName,
      website_url: formattedWebsite,
      contact_name: contactName,
      phone: phone,
      onboarding_stage: 'wizard_step_1',
      onboarding_current_step: 1
    });

    if (success && showToast) {
      toast.success('Progress saved');
    }
    
    return success;
  };

  const handleBlur = () => {
    handleSave(false);
  };

  const handleNext = async () => {
    if (!businessName.trim()) {
      toast.error('Business name is required');
      return;
    }

    if (phone && !validatePhone(phone)) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setIsSaving(true);
    const success = await handleSave(false);
    setIsSaving(false);

    if (success) {
      await updateProfile({
        onboarding_stage: 'wizard_step_2',
        onboarding_current_step: 2
      });
      navigate('/customer/onboarding/wizard/2');
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/2" />
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-40 bg-muted rounded" />
      </div>
    );
  }

  return (
    <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Business Profile
          </CardTitle>
          <CardDescription>
            Tell us about your business so we can personalize your AI assistant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="businessName" className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Business Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="businessName"
              placeholder="Enter your business name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              onBlur={handleBlur}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="websiteUrl" className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              Website URL
            </Label>
            <Input
              id="websiteUrl"
              placeholder="www.yourbusiness.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              onBlur={handleBlur}
            />
            <p className="text-xs text-muted-foreground">
              We'll use your website to train your AI assistant.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactName" className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Your Name
            </Label>
            <Input
              id="contactName"
              placeholder="Your full name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              onBlur={handleBlur}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              Phone Number
            </Label>
            <Input
              id="phone"
              placeholder="555-555-5555"
              value={phone}
              onChange={handlePhoneChange}
              onBlur={handleBlur}
              maxLength={12}
            />
          </div>

          {customerProfile?.business_type && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Business Type</Label>
              <div className="px-3 py-2 bg-muted rounded-md text-muted-foreground">
                {customerProfile.business_type}
              </div>
              <p className="text-xs text-muted-foreground">
                This was set during signup and cannot be changed.
              </p>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button onClick={handleNext} disabled={isSaving} className="gap-2">
              {isSaving ? 'Saving...' : 'Next: Voice & Personality'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
  );
}
