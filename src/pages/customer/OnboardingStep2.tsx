import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerOnboarding } from '@/hooks/useCustomerOnboarding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowRight, Mic, MessageCircle, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AVATAR_OPTIONS } from '@/components/demos/AvatarSelector';

export default function OnboardingStep2() {
  const navigate = useNavigate();
  const { 
    customerProfile, 
    voiceSettings, 
    updateProfile, 
    updateVoiceSettings, 
    updateChatSettings,
    isLoading 
  } = useCustomerOnboarding();
  
  const [voiceGender, setVoiceGender] = useState<string>('female');
  const [greetingText, setGreetingText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (voiceSettings) {
      setVoiceGender(voiceSettings.voice_gender || 'female');
      setGreetingText(voiceSettings.greeting_text || '');
    }
  }, [voiceSettings]);

  const handleSave = async (showToast = false, overrides: Partial<{
    voiceGender: string;
    greetingText: string;
  }> = {}) => {
    const finalVoiceGender = overrides.voiceGender ?? voiceGender;
    const finalGreetingText = overrides.greetingText ?? greetingText;
    
    // Auto-update ai_name based on voice gender
    const aiName = finalVoiceGender === 'male' ? 'Alex' : 'Ashley';

    const success = await updateVoiceSettings({
      voice_gender: finalVoiceGender,
      greeting_text: finalGreetingText,
      language_code: 'en',
      ai_name: aiName
    });

    // Mirror greeting to chat settings
    if (success) {
      await updateChatSettings({
        greeting_text: finalGreetingText
      });
    }

    if (success && showToast) {
      toast.success('Progress saved');
    }
    
    return success;
  };

  const handleBlur = () => {
    handleSave(false);
  };

  const handleNext = async () => {
    setIsSaving(true);
    const success = await handleSave(false);
    setIsSaving(false);

    if (success) {
      await updateProfile({
        onboarding_stage: 'wizard_step_3',
        onboarding_current_step: 3
      });
      navigate('/customer/onboarding/wizard/3');
    }
  };

  const handleBack = () => {
    navigate('/customer/onboarding/wizard/1');
  };

  // Get avatar for gender
  const femaleAvatar = AVATAR_OPTIONS.find(a => a.gender === 'female');
  const maleAvatar = AVATAR_OPTIONS.find(a => a.gender === 'male');

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
            <Mic className="h-5 w-5 text-primary" />
            Voice & Personality
          </CardTitle>
          <CardDescription>
            Choose your AI assistant's voice. You can customize more options in Settings later.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Voice Gender with Avatar Photos */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-muted-foreground" />
              Select Voice
            </Label>
            <div className="flex justify-center gap-6">
              {/* Female Voice */}
              <button
                onClick={() => { setVoiceGender('female'); handleSave(false, { voiceGender: 'female' }); }}
                className={cn(
                  "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all",
                  voiceGender === 'female'
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <div className="relative">
                  <img
                    src={femaleAvatar?.imageUrl}
                    alt="Female Voice"
                    className="w-20 h-20 rounded-full object-cover"
                  />
                  {voiceGender === 'female' && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                <span className="font-medium">Female Voice</span>
              </button>

              {/* Male Voice */}
              <button
                onClick={() => { setVoiceGender('male'); handleSave(false, { voiceGender: 'male' }); }}
                className={cn(
                  "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all",
                  voiceGender === 'male'
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <div className="relative">
                  <img
                    src={maleAvatar?.imageUrl}
                    alt="Male Voice"
                    className="w-20 h-20 rounded-full object-cover"
                  />
                  {voiceGender === 'male' && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                <span className="font-medium">Male Voice</span>
              </button>
            </div>
            <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
              <Settings className="h-3 w-3" />
              You can change your voice and hear samples in Settings later
            </p>
          </div>

          {/* Greeting Text */}
          <div className="space-y-2">
            <Label htmlFor="greeting" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              Greeting Message
            </Label>
            <Textarea
              id="greeting"
              placeholder={`Hello! Thank you for calling ${customerProfile?.business_name || 'our business'}. How can I help you today?`}
              value={greetingText}
              onChange={(e) => setGreetingText(e.target.value)}
              onBlur={handleBlur}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              This is what your AI will say when answering a call or starting a chat.
            </p>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handleBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleNext} disabled={isSaving} className="gap-2">
              {isSaving ? 'Saving...' : 'Next: Knowledge & Content'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
  );
}
