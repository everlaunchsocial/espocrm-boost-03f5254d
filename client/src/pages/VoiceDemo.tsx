import { useState } from "react";
import { Globe, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { WebsitePreview } from "@/components/voice-demo/WebsitePreview";
import { BusinessInfoCard } from "@/components/voice-demo/BusinessInfoCard";
import { VoiceWidget, VoiceProvider } from "@/components/voice-demo/VoiceWidget";
import { ProviderToggle } from "@/components/voice-demo/ProviderToggle";

interface BusinessInfo {
  businessName: string;
  title: string;
  description: string;
  phones: string[];
  emails: string[];
  services: string[];
  address: string;
  hours: string;
  url: string;
}

const VoiceDemo = () => {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [voiceProvider, setVoiceProvider] = useState<VoiceProvider>('openai');

  const analyzeWebsite = async () => {
    if (!url) {
      toast({
        title: "URL required",
        description: "Please enter a website URL",
        variant: "destructive",
      });
      return;
    }

    // Normalize URL
    let normalizedUrl = url;
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    setIsAnalyzing(true);
    setBusinessInfo(null);
    setScreenshotUrl(null);

    try {
      // Call edge function to scrape website
      const { data, error } = await supabase.functions.invoke('scrape-website', {
        body: { url: normalizedUrl }
      });

      if (error) throw error;

      setBusinessInfo(data);
      
      // Generate a placeholder screenshot URL (in production you'd use a screenshot API)
      // For now we'll use a service like urlbox or screenshot.guru
      const screenshotService = `https://image.thum.io/get/width/1200/crop/800/noanimate/${encodeURIComponent(normalizedUrl)}`;
      setScreenshotUrl(screenshotService);

      toast({
        title: "Website analyzed",
        description: `Found business: ${data.businessName}`,
      });
    } catch (error) {
      console.error('Error analyzing website:', error);
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Failed to analyze website",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      analyzeWebsite();
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Voice AI Demo
          </h1>
          <p className="text-muted-foreground mt-1">
            Experience how AI voice agents could work for any business
          </p>
        </div>

        {/* Provider Toggle */}
        <ProviderToggle 
          value={voiceProvider} 
          onChange={setVoiceProvider} 
        />
      </div>

      {/* URL Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Analyze a Website</CardTitle>
          <CardDescription>
            Enter any business website URL to create a personalized AI voice demo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-9"
                disabled={isAnalyzing}
              />
            </div>
            <Button onClick={analyzeWebsite} disabled={isAnalyzing}>
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Analyze
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Website Preview */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Website Preview</h2>
          <WebsitePreview 
            screenshotUrl={screenshotUrl || undefined}
            websiteUrl={businessInfo?.url}
            isLoading={isAnalyzing}
          />
        </div>

        {/* Business Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Extracted Information</h2>
          <BusinessInfoCard 
            businessInfo={businessInfo}
            isLoading={isAnalyzing}
          />

          {/* Instructions */}
          {businessInfo && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <h3 className="font-medium text-foreground mb-2">Try the Voice Demo</h3>
                <p className="text-sm text-muted-foreground">
                  Click the phone button in the bottom right corner to start a voice conversation 
                  with an AI receptionist trained on this business's information. 
                  {voiceProvider === 'elevenlabs' && (
                    <span className="block mt-2 text-purple-600 dark:text-purple-400">
                      Using ElevenLabs for premium voice quality.
                    </span>
                  )}
                  {voiceProvider === 'openai' && (
                    <span className="block mt-2 text-primary">
                      Using OpenAI Realtime for low-latency conversation.
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Voice Widget */}
      <VoiceWidget 
        businessInfo={businessInfo}
        disabled={isAnalyzing}
        provider={voiceProvider}
      />
    </div>
  );
};

export default VoiceDemo;
