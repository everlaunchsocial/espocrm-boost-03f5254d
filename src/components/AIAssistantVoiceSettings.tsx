import { useState } from 'react';
import { Settings, Play, Loader2, Volume2, Check, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAIVoiceSettings, voiceOptions } from '@/hooks/useAIVoiceSettings';
import { cn } from '@/lib/utils';

interface AIAssistantVoiceSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIAssistantVoiceSettings({ open, onOpenChange }: AIAssistantVoiceSettingsProps) {
  const {
    settings,
    loading,
    saving,
    previewPlaying,
    saveSettings,
    previewVoice,
  } = useAIVoiceSettings();

  const [localVoice, setLocalVoice] = useState(settings.voice);
  const [localSpeed, setLocalSpeed] = useState(settings.speechSpeed);
  const [localAutoPlay, setLocalAutoPlay] = useState(settings.autoPlayResponses);
  const [localSensitivity, setLocalSensitivity] = useState(settings.voiceSensitivity);

  // Sync local state when settings load
  useState(() => {
    setLocalVoice(settings.voice);
    setLocalSpeed(settings.speechSpeed);
    setLocalAutoPlay(settings.autoPlayResponses);
    setLocalSensitivity(settings.voiceSensitivity);
  });

  const handleSave = async () => {
    const success = await saveSettings({
      voice: localVoice,
      speechSpeed: localSpeed,
      autoPlayResponses: localAutoPlay,
      voiceSensitivity: localSensitivity,
    });
    if (success) {
      onOpenChange(false);
    }
  };

  const hasChanges = 
    localVoice !== settings.voice ||
    localSpeed !== settings.speechSpeed ||
    localAutoPlay !== settings.autoPlayResponses ||
    localSensitivity !== settings.voiceSensitivity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Voice Assistant Settings
          </DialogTitle>
          <DialogDescription>
            Customize how your AI assistant sounds and responds
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Voice Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                Voice
              </Label>
              <div className="grid gap-2">
                {voiceOptions.map((voice) => (
                  <div
                    key={voice.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer",
                      localVoice === voice.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:border-muted-foreground/30"
                    )}
                    onClick={() => setLocalVoice(voice.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-lg">
                        {voice.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{voice.name}</span>
                          {localVoice === voice.id && (
                            <Check className="h-3.5 w-3.5 text-primary" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{voice.description}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        previewVoice(voice.id);
                      }}
                      disabled={previewPlaying !== null}
                    >
                      {previewPlaying === voice.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Speech Speed */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Gauge className="h-4 w-4" />
                  Speech Speed
                </Label>
                <span className="text-sm text-muted-foreground">
                  {localSpeed.toFixed(2)}x
                </span>
              </div>
              <Slider
                value={[localSpeed]}
                onValueChange={([value]) => setLocalSpeed(value)}
                min={0.75}
                max={1.5}
                step={0.05}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Slower (0.75x)</span>
                <span>Faster (1.5x)</span>
              </div>
            </div>

            {/* Voice Activation Sensitivity */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Voice Activation Sensitivity</Label>
              <RadioGroup
                value={localSensitivity}
                onValueChange={(value) => setLocalSensitivity(value as typeof localSensitivity)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="low" id="sensitivity-low" />
                  <Label htmlFor="sensitivity-low" className="text-sm cursor-pointer">Low</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="sensitivity-medium" />
                  <Label htmlFor="sensitivity-medium" className="text-sm cursor-pointer">Medium</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="high" id="sensitivity-high" />
                  <Label htmlFor="sensitivity-high" className="text-sm cursor-pointer">High</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Auto-play Responses */}
            <div className="flex items-center justify-between py-2">
              <div>
                <Label className="text-sm font-medium">Auto-play Responses</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically play AI voice responses
                </p>
              </div>
              <Switch
                checked={localAutoPlay}
                onCheckedChange={setLocalAutoPlay}
              />
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || !hasChanges}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
