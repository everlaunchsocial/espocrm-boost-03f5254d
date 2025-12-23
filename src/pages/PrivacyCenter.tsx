import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Shield, Download, Trash2, Edit, Ban, FileText, CheckCircle, Mail } from 'lucide-react';
import { useCreateDataRequest, REQUEST_TYPES, usePrivacySettings } from '@/hooks/useCompliance';

export default function PrivacyCenter() {
  const [email, setEmail] = useState('');
  const [requestType, setRequestType] = useState('export');
  const [details, setDetails] = useState('');
  const [submitted, setSubmitted] = useState(false);
  
  const { data: privacySettings } = usePrivacySettings();
  const createRequest = useCreateDataRequest();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    await createRequest.mutateAsync({
      request_type: requestType,
      email,
      requested_by: email,
      request_details: { additional_info: details },
    });
    
    setSubmitted(true);
  };

  const getRequestIcon = (type: string) => {
    switch (type) {
      case 'export': return <Download className="h-5 w-5" />;
      case 'deletion': return <Trash2 className="h-5 w-5" />;
      case 'correction': return <Edit className="h-5 w-5" />;
      case 'opt_out': return <Ban className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Request Submitted</CardTitle>
            <CardDescription>
              We've sent a verification email to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <p className="text-sm">Please check your inbox and click the verification link</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Your request will be processed within 30 days as required by GDPR.
            </p>
            <Button variant="outline" onClick={() => setSubmitted(false)}>
              Submit Another Request
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Privacy Center</h1>
          <p className="text-muted-foreground mt-2">
            Your Data Rights & Privacy Controls
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Download className="h-5 w-5 text-blue-500" />
                Right to Access
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Request a copy of all data we have about you in a portable format.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Trash2 className="h-5 w-5 text-red-500" />
                Right to Deletion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Request complete deletion of your data from our systems (Right to be Forgotten).
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Edit className="h-5 w-5 text-yellow-500" />
                Right to Correction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Request corrections to inaccurate data we hold about you.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Ban className="h-5 w-5 text-orange-500" />
                Right to Opt-Out
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Opt out of marketing communications or data processing.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Submit a Data Request</CardTitle>
            <CardDescription>
              Enter your email to exercise your data rights. We'll send a verification link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="request-type">What would you like to do?</Label>
                <RadioGroup value={requestType} onValueChange={setRequestType} className="grid gap-3">
                  {REQUEST_TYPES.map((type) => (
                    <div
                      key={type.value}
                      className={`flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                        requestType === type.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setRequestType(type.value)}
                    >
                      <RadioGroupItem value={type.value} id={type.value} />
                      <div className="flex items-center gap-3 flex-1">
                        {getRequestIcon(type.value)}
                        <div>
                          <Label htmlFor={type.value} className="cursor-pointer font-medium">
                            {type.label}
                          </Label>
                          <p className="text-sm text-muted-foreground">{type.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Your Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="details">Additional Details (optional)</Label>
                <Textarea
                  id="details"
                  placeholder="Provide any additional information about your request..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full" disabled={createRequest.isPending}>
                {createRequest.isPending ? 'Submitting...' : 'Submit Request'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center space-y-4">
          {privacySettings?.privacy_policy_url && (
            <a
              href={privacySettings.privacy_policy_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              <FileText className="h-4 w-4" />
              Read our Privacy Policy
            </a>
          )}
          
          {privacySettings?.dpo_email && (
            <p className="text-sm text-muted-foreground">
              Data Protection Officer: <a href={`mailto:${privacySettings.dpo_email}`} className="text-primary hover:underline">{privacySettings.dpo_email}</a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
