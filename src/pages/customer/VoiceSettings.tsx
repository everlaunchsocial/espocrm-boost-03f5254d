import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Volume2, RotateCcw, Check } from "lucide-react";
import { useVoiceSettings } from "@/hooks/useVoiceSettings";
import { CUSTOMER_FEMALE_VOICES, CUSTOMER_MALE_VOICES, CartesiaVoice } from "@/lib/cartesiaVoices";
import { cn } from "@/lib/utils";

export default function VoiceSettings() {
  const { 
    settings, 
    isLoading, 
    isSaving, 
    updateSettings, 
    previewVoice,
    isPreviewLoading 
  } = useVoiceSettings();
  
  const [localSettings, setLocalSettings] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  useEffect(() => {
    if (settings && localSettings) {
      const changed = 
        settings.voiceId !== localSettings.voiceId ||
        settings.voiceSpeed !== localSettings.voiceSpeed ||
        settings.greetingText !== localSettings.greetingText;
      setHasChanges(changed);
    }
  }, [settings, localSettings]);

  const handleVoiceSelect = (voiceId: string) => {
    setLocalSettings(prev => prev ? { ...prev, voiceId } : prev);
  };

  const handleSpeedChange = (value: number[]) => {
    setLocalSettings(prev => prev ? { ...prev, voiceSpeed: value[0] } : prev);
  };

  const handleGreetingChange = (value: string) => {
    setLocalSettings(prev => prev ? { ...prev, greetingText: value } : prev);
  };

  const handlePreviewVoice = async (voiceId: string) => {
    setPreviewingVoiceId(voiceId);
    const textToPreview = localSettings?.greetingText || "Hi there! Thanks for calling. How can I help you today?";
    await previewVoice(voiceId, textToPreview, localSettings?.voiceSpeed);
    setPreviewingVoiceId(null);
  };

  const handleSave = async () => {
    if (localSettings) {
      await updateSettings({
        voiceId: localSettings.voiceId,
        voiceSpeed: localSettings.voiceSpeed,
        greetingText: localSettings.greetingText,
      });
      setHasChanges(false);
    }
  };

  const handleResetGreeting = () => {
    const defaultGreeting = "Hi there! Thanks for calling. How can I help you today?";
    setLocalSettings(prev => prev ? { ...prev, greetingText: defaultGreeting } : prev);
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const handleChooseVoice = async (voiceId: string) => {
    setLocalSettings(prev => prev ? { ...prev, voiceId } : prev);
    await updateSettings({ voiceId });
  };

  const VoiceOption = ({ voice, isSelected }: { voice: CartesiaVoice; isSelected: boolean }) => (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border transition-all",
        isSelected 
          ? "border-primary bg-primary/10" 
          : "border-border"
      )}
    >
      <div className="flex items-center gap-3">
        {isSelected && <Check className="h-4 w-4 text-primary" />}
        <span className={cn("font-medium", isSelected && "text-primary")}>{voice.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handlePreviewVoice(voice.id)}
          disabled={isPreviewLoading && previewingVoiceId === voice.id}
          className="h-8 w-8 p-0"
        >
          <Volume2 className={cn(
            "h-4 w-4",
            isPreviewLoading && previewingVoiceId === voice.id && "animate-pulse"
          )} />
        </Button>
        {!isSelected && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleChooseVoice(voice.id)}
            disabled={isSaving}
            className="h-8"
          >
            Choose
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-6 md:p-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Voice & Personality</h1>
          <p className="text-muted-foreground">Configure how your AI assistant sounds</p>
        </div>

        {/* Voice Selection - Split Layout */}
        <Card>
          <CardHeader>
            <CardTitle>Select Voice</CardTitle>
            <CardDescription>Choose a voice for your AI assistant. Click the speaker icon to preview.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Female Voices */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Female Voices</h3>
                <div className="space-y-2">
                  {CUSTOMER_FEMALE_VOICES.map((voice) => (
                    <VoiceOption 
                      key={voice.id} 
                      voice={voice} 
                      isSelected={localSettings?.voiceId === voice.id}
                    />
                  ))}
                </div>
              </div>

              {/* Male Voices */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Male Voices</h3>
                <div className="space-y-2">
                  {CUSTOMER_MALE_VOICES.map((voice) => (
                    <VoiceOption 
                      key={voice.id} 
                      voice={voice} 
                      isSelected={localSettings?.voiceId === voice.id}
                    />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Voice Speed */}
        <Card>
          <CardHeader>
            <CardTitle>Voice Speed</CardTitle>
            <CardDescription>Adjust how fast your AI assistant speaks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Slower</span>
              <span className="font-medium text-foreground">{localSettings?.voiceSpeed?.toFixed(1)}x</span>
              <span>Faster</span>
            </div>
            <Slider
              value={[localSettings?.voiceSpeed || 1.0]}
              onValueChange={handleSpeedChange}
              min={0.5}
              max={2.0}
              step={0.1}
              className="w-full"
            />
          </CardContent>
        </Card>

        {/* Greeting Message */}
        <Card>
          <CardHeader>
            <CardTitle>Greeting Message</CardTitle>
            <CardDescription>The first thing your AI says when answering a call</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="greeting">Greeting Text</Label>
              <Textarea
                id="greeting"
                placeholder="Hi there! Thanks for calling. How can I help you today?"
                value={localSettings?.greetingText || ""}
                onChange={(e) => handleGreetingChange(e.target.value)}
                rows={3}
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleResetGreeting}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Default
            </Button>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || isSaving}
            size="lg"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
