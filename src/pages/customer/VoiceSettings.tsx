import { useState, useEffect } from 'react';
import { useVoiceSettings, VoiceStyle, ResponsePace } from '@/hooks/useVoiceSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Mic, Volume2, Save, Loader2, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FEMALE_VOICES, MALE_VOICES, getVoiceById } from '@/lib/cartesiaVoices';

export default function VoiceSettings() {
  const { isLoading, isSaving, isPreviewing, settings, businessName, updateSettings, validateSettings, getDefaultGreeting, previewVoice } = useVoiceSettings();
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

  const handleVoiceChange = (voiceId: string) => {
    const voice = getVoiceById(voiceId);
    setLocalSettings(prev => ({
      ...prev,
      voice_id: voiceId,
      voice_gender: voice?.gender || prev.voice_gender,
    }));
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
    if (localSettings.voice_id) {
      previewVoice(localSettings.voice_id);
    }
  };

  const handleResetGreeting = () => {
    const defaultGreeting = getDefaultGreeting(businessName);
    handleChange('greeting_text', defaultGreeting);
  };

  const selectedVoice = getVoiceById(localSettings.voice_id);

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

        {/* Voice Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mic className="h-5 w-5 text-primary" />
              Voice Selection
            </CardTitle>
            <CardDescription>
              Choose a voice for your AI assistant
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label className="text-base font-medium mb-2 block">Select Voice</Label>
                <Select value={localSettings.voice_id} onValueChange={handleVoiceChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a voice">
                      {selectedVoice ? `${selectedVoice.name} (${selectedVoice.gender})` : 'Choose a voice'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Female Voices</SelectLabel>
                      {FEMALE_VOICES.map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                          {voice.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Male Voices</SelectLabel>
                      {MALE_VOICES.map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                          {voice.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={handlePreviewVoice}
                  disabled={isPreviewing || !localSettings.voice_id}
                  className="w-full sm:w-auto"
                >
                  {isPreviewing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Preview
                </Button>
              </div>
            </div>
            {selectedVoice && (
              <p className="text-sm text-muted-foreground">
                Selected: <span className="font-medium text-foreground">{selectedVoice.name}</span> ({selectedVoice.gender} voice)
              </p>
            )}
          </CardContent>
        </Card>

        {/* Voice Style & Pace */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Volume2 className="h-5 w-5 text-primary" />
              Voice Style
            </CardTitle>
            <CardDescription>
              Set the personality and pacing of your AI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Voice Style */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Personality Style</Label>
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
        <div className="flex items-center justify-end pt-4">
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
