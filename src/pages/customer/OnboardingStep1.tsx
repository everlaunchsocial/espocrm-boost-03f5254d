import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerOnboarding } from '@/hooks/useCustomerOnboarding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Building2, Globe, User, Phone, MapPin, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { IndustryCombobox } from '@/components/ui/industry-combobox';
import { normalizeUrl, isValidUrl, getUrlValidationError } from '@/utils/normalizeUrl';
import { supabase } from '@/integrations/supabase/client';

export default function OnboardingStep1() {
  const navigate = useNavigate();
  const { customerProfile, updateProfile, isLoading } = useCustomerOnboarding();
  
  // Contact info
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  // Business info
  const [businessType, setBusinessType] = useState('');
  const [otherIndustry, setOtherIndustry] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [websiteError, setWebsiteError] = useState<string | null>(null);

  // Fetch user email on mount
  useEffect(() => {
    const fetchUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setEmail(user.email);
      }
    };
    fetchUserEmail();
  }, []);

  useEffect(() => {
    if (customerProfile) {
      const bt = customerProfile.business_type || '';
      // Check if it's an "Other:" prefixed value
      if (bt.startsWith('Other: ')) {
        setBusinessType('other');
        setOtherIndustry(bt.replace('Other: ', ''));
      } else {
        setBusinessType(bt);
        setOtherIndustry('');
      }
      setBusinessName(customerProfile.business_name || '');
      setStreetAddress(customerProfile.street_address || '');
      setCity(customerProfile.city || '');
      setState(customerProfile.state || '');
      setZipCode(customerProfile.zip_code || '');
      setWebsiteUrl(customerProfile.website_url || '');
      setBusinessPhone(customerProfile.business_phone || '');
      setContactName(customerProfile.contact_name || '');
      setPhone(customerProfile.phone || '');
    }
  }, [customerProfile]);

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

  const handleBusinessPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setBusinessPhone(formatted);
  };

  const validatePhone = (phoneNumber: string) => {
    if (!phoneNumber) return true;
    const cleaned = phoneNumber.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  };

  const validateEmail = (emailValue: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue);
  };

  const getEffectiveBusinessType = () => {
    if (businessType === 'other' && otherIndustry.trim()) {
      return `Other: ${otherIndustry.trim()}`;
    }
    return businessType;
  };

  const handleIndustryChange = async (value: string) => {
    setBusinessType(value);
    if (value !== 'other') {
      setOtherIndustry('');
    }
    
    const effectiveType = value === 'other' ? '' : value;
    if (effectiveType) {
      await updateProfile({
        business_type: effectiveType,
        onboarding_stage: 'wizard_step_1',
        onboarding_current_step: 1
      });
      toast.success('Industry selected');
    }
  };

  const handleWebsiteBlur = () => {
    if (websiteUrl) {
      const normalized = normalizeUrl(websiteUrl);
      setWebsiteUrl(normalized);
      const error = getUrlValidationError(normalized);
      setWebsiteError(error);
    }
    handleSave(false);
  };

  const handleSave = async (showToast = false) => {
    const formattedWebsite = normalizeUrl(websiteUrl);
    const effectiveBusinessType = getEffectiveBusinessType();
    
    const success = await updateProfile({
      business_type: effectiveBusinessType,
      business_name: businessName,
      street_address: streetAddress,
      city: city,
      state: state,
      zip_code: zipCode,
      website_url: formattedWebsite,
      business_phone: businessPhone,
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
    // Validate required contact fields
    if (!contactName.trim()) {
      toast.error('Your name is required');
      return;
    }

    if (!email.trim()) {
      toast.error('Your email is required');
      return;
    }

    if (!validateEmail(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Validate required business fields
    if (!businessName.trim()) {
      toast.error('Business name is required');
      return;
    }

    if (!businessType) {
      toast.error('Please select your industry');
      return;
    }

    if (businessType === 'other' && !otherIndustry.trim()) {
      toast.error('Please specify your industry');
      return;
    }

    if (websiteUrl && !isValidUrl(websiteUrl)) {
      toast.error('Please enter a valid website URL');
      return;
    }

    if (phone && !validatePhone(phone)) {
      toast.error('Please enter a valid cell phone number');
      return;
    }

    if (businessPhone && !validatePhone(businessPhone)) {
      toast.error('Please enter a valid business phone number');
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
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Business Profile
          </CardTitle>
          <CardDescription>
            Tell us about yourself and your business so we can personalize your AI assistant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* SECTION 1: Your Contact Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <User className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Your Contact Information</h3>
            </div>

            {/* Your Name */}
            <div className="space-y-2">
              <Label htmlFor="contactName" className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Your Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contactName"
                placeholder="Your full name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                onBlur={handleBlur}
              />
            </div>

            {/* Your Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Your Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={handleBlur}
              />
            </div>

            {/* Cell Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Your Cell Phone <span className="text-destructive">*</span>
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
          </div>

          {/* SECTION 2: Business Information */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Building2 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Business Information</h3>
            </div>

            {/* Business Name */}
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

            {/* Industry */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Industry <span className="text-destructive">*</span>
              </Label>
              <IndustryCombobox
                value={businessType}
                onChange={handleIndustryChange}
                placeholder="Select your industry..."
              />
            </div>

            {/* Other Industry - Conditional */}
            {businessType === 'other' && (
              <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                <Label htmlFor="otherIndustry" className="flex items-center gap-2">
                  Please specify your industry <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="otherIndustry"
                  placeholder="e.g., Custom Software Development"
                  value={otherIndustry}
                  onChange={(e) => setOtherIndustry(e.target.value)}
                  onBlur={handleBlur}
                />
                <p className="text-xs text-muted-foreground">
                  We'll use a professional generic assistant while we review your industry.
                </p>
              </div>
            )}

            {/* Address Section */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Business Address
              </Label>
              
              <div className="space-y-2">
                <Input
                  id="streetAddress"
                  placeholder="Street Address"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  onBlur={handleBlur}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="col-span-2 md:col-span-2">
                  <Input
                    id="city"
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    onBlur={handleBlur}
                  />
                </div>
                <div>
                  <Input
                    id="state"
                    placeholder="State"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    onBlur={handleBlur}
                  />
                </div>
                <div>
                  <Input
                    id="zipCode"
                    placeholder="Zip Code"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    onBlur={handleBlur}
                    maxLength={10}
                  />
                </div>
              </div>
            </div>

            {/* Website URL */}
            <div className="space-y-2">
              <Label htmlFor="websiteUrl" className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Website URL
              </Label>
              <Input
                id="websiteUrl"
                placeholder="yoursite.com"
                value={websiteUrl}
                onChange={(e) => {
                  setWebsiteUrl(e.target.value);
                  setWebsiteError(null);
                }}
                onBlur={handleWebsiteBlur}
                className={websiteError ? 'border-destructive' : ''}
              />
              {websiteError ? (
                <p className="text-xs text-destructive">{websiteError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  We'll use your website to train your AI assistant.
                </p>
              )}
            </div>

            {/* Business Phone */}
            <div className="space-y-2">
              <Label htmlFor="businessPhone" className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Business Phone
              </Label>
              <Input
                id="businessPhone"
                placeholder="555-555-5555"
                value={businessPhone}
                onChange={handleBusinessPhoneChange}
                onBlur={handleBlur}
                maxLength={12}
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleNext} disabled={isSaving} className="gap-2">
              {isSaving ? 'Saving...' : 'Next: Voice & Personality'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
