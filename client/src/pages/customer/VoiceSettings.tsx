import { useState, useEffect } from 'react';
import { useVoiceSettings, VoiceGender, VoiceStyle, ResponsePace } from '@/hooks/useVoiceSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Mic, Volume2, Save, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function VoiceSettings() {
  const { isLoading, isSaving, settings, businessName, updateSettings, validateSettings, getDefaultGreeting } = useVoiceSettings();
  const [localSettings, setLocalSettings] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync local state when settings load
  useEffect(() => {
    if (!isLoading) {
      setLocalSettings(settings);
    }
  }, [isLoading, settings]);

  const handleChange = <K extends keyof typeof localSettings>(field: K, value: typeof localSettings[K]) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    const error = validateSettings(localSettings);
    if (error) {
      toast.error(error);
      return;
    }
    await updateSettings(localSettings);
    setHasChanges(false);
  };

  const handlePreviewVoice = () => {
    // For now, show a toast - actual voice preview would require API integration
    toast.info('Voice preview coming soon! Your AI will use these settings when handling calls.');
  };

  const handleResetGreeting = () => {
    const defaultGreeting = getDefaultGreeting(businessName);
    handleChange('greeting_text', defaultGreeting);
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Voice & Personality</h1>
            <p className="text-muted-foreground">
              Customize how your AI assistant sounds and responds
            </p>
          </div>
          <Link to="/customer/settings" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Settings
          </Link>
        </div>

        {/* Voice Gender & Style */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mic className="h-5 w-5 text-primary" />
              Voice Options
            </CardTitle>
            <CardDescription>
              Choose the voice characteristics for your AI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Voice Gender */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Voice Gender</Label>
              <RadioGroup
                value={localSettings.voice_gender}
                onValueChange={(value) => handleChange('voice_gender', value as VoiceGender)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="female" />
                  <Label htmlFor="female" className="cursor-pointer">Female</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male" className="cursor-pointer">Male</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Voice Style */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Voice Style</Label>
              <RadioGroup
                value={localSettings.voice_style}
                onValueChange={(value) => handleChange('voice_style', value as VoiceStyle)}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3"
              >
                <Label
                  htmlFor="friendly"
                  className={`flex flex-col items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                    localSettings.voice_style === 'friendly' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                >
                  <RadioGroupItem value="friendly" id="friendly" className="sr-only" />
                  <span className="font-medium">Friendly</span>
                  <span className="text-xs text-muted-foreground text-center mt-1">Warm and approachable</span>
                </Label>
                <Label
                  htmlFor="professional"
                  className={`flex flex-col items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                    localSettings.voice_style === 'professional' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                >
                  <RadioGroupItem value="professional" id="professional" className="sr-only" />
                  <span className="font-medium">Professional</span>
                  <span className="text-xs text-muted-foreground text-center mt-1">Business-focused tone</span>
                </Label>
                <Label
                  htmlFor="high_energy"
                  className={`flex flex-col items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                    localSettings.voice_style === 'high_energy' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                >
                  <RadioGroupItem value="high_energy" id="high_energy" className="sr-only" />
                  <span className="font-medium">High-energy</span>
                  <span className="text-xs text-muted-foreground text-center mt-1">Enthusiastic & upbeat</span>
                </Label>
              </RadioGroup>
            </div>

            {/* Response Pace */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Response Pace</Label>
              <RadioGroup
                value={localSettings.response_pace}
                onValueChange={(value) => handleChange('response_pace', value as ResponsePace)}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3"
              >
                <Label
                  htmlFor="quick"
                  className={`flex flex-col items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                    localSettings.response_pace === 'quick' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                >
                  <RadioGroupItem value="quick" id="quick" className="sr-only" />
                  <span className="font-medium">Quick</span>
                  <span className="text-xs text-muted-foreground text-center mt-1">Fast responses</span>
                </Label>
                <Label
                  htmlFor="balanced"
                  className={`flex flex-col items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                    localSettings.response_pace === 'balanced' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                >
                  <RadioGroupItem value="balanced" id="balanced" className="sr-only" />
                  <span className="font-medium">Balanced</span>
                  <span className="text-xs text-muted-foreground text-center mt-1">Natural pacing</span>
                </Label>
                <Label
                  htmlFor="thoughtful"
                  className={`flex flex-col items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                    localSettings.response_pace === 'thoughtful' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                >
                  <RadioGroupItem value="thoughtful" id="thoughtful" className="sr-only" />
                  <span className="font-medium">Thoughtful</span>
                  <span className="text-xs text-muted-foreground text-center mt-1">Measured delivery</span>
                </Label>
              </RadioGroup>
            </div>

            {/* Language */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Language</Label>
              <Select
                value={localSettings.language_code}
                onValueChange={(value) => handleChange('language_code', value)}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es" disabled>Spanish (coming soon)</SelectItem>
                  <SelectItem value="fr" disabled>French (coming soon)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Greeting Text */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Volume2 className="h-5 w-5 text-primary" />
              Greeting Message
            </CardTitle>
            <CardDescription>
              What your AI says when answering a call or starting a chat
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="greeting">Greeting Text</Label>
                <button
                  type="button"
                  onClick={handleResetGreeting}
                  className="text-xs text-primary hover:underline"
                >
                  Reset to default
                </button>
              </div>
              <Textarea
                id="greeting"
                value={localSettings.greeting_text}
                onChange={(e) => handleChange('greeting_text', e.target.value)}
                placeholder="Hello, thanks for calling..."
                className="min-h-[100px]"
                maxLength={300}
              />
              <p className="text-xs text-muted-foreground">
                {localSettings.greeting_text.length}/300 characters
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          <Button variant="outline" onClick={handlePreviewVoice}>
            <Volume2 className="h-4 w-4 mr-2" />
            Preview Voice
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
