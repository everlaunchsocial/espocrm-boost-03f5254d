import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentAffiliate } from "@/hooks/useCurrentAffiliate";
import { useAffiliateVideos } from "@/hooks/useAffiliateVideos";
import { usePersistedFileUploads } from "@/hooks/usePersistedFileUploads";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  AlertCircle,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mic,
  Upload,
  X,
  FileAudio,
} from "lucide-react";

const STEPS = [
  { id: 1, title: "Requirements", description: "Review what you need" },
  { id: 2, title: "Photos", description: "Upload 5 photos" },
  { id: 3, title: "Voice", description: "Upload your voice" },
  { id: 4, title: "Submit", description: "Create your avatar" },
];

const PHOTO_REQUIREMENTS = [
  "Clear, well-lit front-facing photo",
  "Looking directly at camera",
  "Neutral expression",
  "No sunglasses or hats",
  "Professional attire recommended",
];

const VOICE_REQUIREMENTS = [
  "MP3 or WAV format (192kbps+ recommended)",
  "1-2 minutes of clear speech",
  "Quiet environment, no background noise",
  "Consistent volume and natural pace",
  "Single speaker only",
];

export default function AdminCreateAvatarProfile() {
  const navigate = useNavigate();
  const { affiliateId } = useCurrentAffiliate();
  const { createAvatarProfile, profile } = useAffiliateVideos();

  const {
    photos,
    voice,
    isRestoring,
    uploadingPhotoIndex,
    isUploadingVoice,
    uploadPhoto,
    removePhoto,
    uploadVoice,
    clearVoice,
    clearDraft,
    getFinalUrls,
  } = usePersistedFileUploads(affiliateId);

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = "Create Avatar Profile | Admin";
  }, []);

  // If profile already exists and is training/ready, go back to admin list
  useEffect(() => {
    if (profile && (profile.status === "training" || profile.status === "ready")) {
      navigate("/admin/affiliate-videos", { replace: true });
    }
  }, [navigate, profile]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((f) => f.type.startsWith("image/"));

    if (validFiles.length + photos.length > 5) {
      toast.error("Maximum 5 photos allowed");
      return;
    }

    // Upload each file immediately
    for (let i = 0; i < validFiles.length; i++) {
      const nextIndex = photos.length + i;
      if (nextIndex < 5) {
        await uploadPhoto(validFiles[i], nextIndex);
      }
    }

    // Clear input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleVoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error("File too large. Maximum 50MB.");
      return;
    }

    // Get audio duration
    const audio = new Audio();
    audio.src = URL.createObjectURL(file);
    audio.onloadedmetadata = async () => {
      const duration = Math.round(audio.duration);
      await uploadVoice(file, duration);
      URL.revokeObjectURL(audio.src);
    };
  };

  const handleClearVoice = async () => {
    await clearVoice();
  };

  const handleSubmit = async () => {
    if (photos.length < 5 || !voice) {
      toast.error("Please upload 5 photos and a voice recording");
      return;
    }

    setIsSubmitting(true);
    try {
      const { photoUrls, voiceUrl } = await getFinalUrls();

      if (photoUrls.length !== 5 || !voiceUrl) {
        toast.error("Failed to prepare files for submission");
        return;
      }

      const result = await createAvatarProfile(photoUrls, voiceUrl);
      if (result) {
        await clearDraft();
        navigate("/admin/affiliate-videos");
      }
    } catch (error: any) {
      toast.error("Failed to create profile: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return true;
      case 2:
        return photos.length === 5;
      case 3:
        return !!voice && voice.duration >= 30;
      case 4:
        return photos.length === 5 && !!voice;
      default:
        return false;
    }
  };

  if (!affiliateId) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Button variant="ghost" onClick={() => navigate("/admin/affiliate-videos")} className="mb-4">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex flex-col items-center py-12">
            <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Affiliate Account Required</h3>
            <p className="text-muted-foreground text-center max-w-md">
              To create an avatar and videos, your user must have an affiliate profile (username).
            </p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => navigate("/admin/affiliates")}>Manage Affiliates</Button>
              <Button onClick={() => navigate("/admin/affiliate-videos")}>Back to Admin</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isRestoring) {
    return (
      <div className="max-w-3xl mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Restoring your progress...</p>
        </div>
      </div>
    );
  }

  const handleClearDraft = async () => {
    if (confirm('Clear all uploaded photos and voice? This cannot be undone.')) {
      await clearDraft();
      toast.success('Draft cleared');
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Button variant="ghost" onClick={() => navigate("/admin/affiliate-videos")} className="mb-4">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Affiliate Videos Admin
          </Button>
          <h1 className="text-2xl font-bold">Create AI Avatar</h1>
          <p className="text-muted-foreground">Set up your personalized AI avatar for video creation</p>
        </div>
        {(photos.length > 0 || voice) && (
          <Button variant="ghost" size="sm" onClick={handleClearDraft} className="text-destructive hover:text-destructive">
            <X className="h-4 w-4 mr-1" />
            Clear Draft
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          {STEPS.map((s) => (
            <div key={s.id} className={`flex items-center gap-2 ${step >= s.id ? "text-primary" : "text-muted-foreground"}`}>
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium
                ${step > s.id ? "bg-primary text-primary-foreground" : step === s.id ? "bg-primary/20 text-primary border-2 border-primary" : "bg-muted"}`}
              >
                {step > s.id ? <Check className="h-4 w-4" /> : s.id}
              </div>
              <span className="hidden sm:inline">{s.title}</span>
            </div>
          ))}
        </div>
        <Progress value={(step / 4) * 100} className="h-2" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{STEPS[step - 1].title}</CardTitle>
          <CardDescription>{STEPS[step - 1].description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Camera className="h-5 w-5 text-primary" />5 Photos Required
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {PHOTO_REQUIREMENTS.map((req, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Mic className="h-5 w-5 text-primary" />Voice Recording Upload
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {VOICE_REQUIREMENTS.map((req, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">Processing Time</p>
                    <p className="text-muted-foreground">Avatar creation typically takes 10-30 minutes.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                {[0, 1, 2, 3, 4].map((index) => (
                  <div
                    key={index}
                    className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center relative overflow-hidden bg-muted/50"
                  >
                    {uploadingPhotoIndex === index ? (
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    ) : photos[index] ? (
                      <>
                        <img src={photos[index].previewUrl} alt={`Avatar training photo ${index + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => removePhoto(index)}
                          className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <Camera className="h-8 w-8 text-muted-foreground/50" />
                    )}
                  </div>
                ))}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => fileInputRef.current?.click()} 
                disabled={photos.length >= 5 || uploadingPhotoIndex !== null}
              >
                {uploadingPhotoIndex !== null ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" />Upload Photos ({photos.length}/5)</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Photos are saved automatically. You can safely switch tabs and return.
              </p>
            </div>
          )}

          {/* Step 3: Voice Upload */}
          {step === 3 && (
            <div className="space-y-6">
              {voice ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted flex items-center gap-4">
                    <FileAudio className="h-8 w-8 text-primary shrink-0" />
                    <audio src={voice.previewUrl} controls className="flex-1" />
                    <Button variant="ghost" size="icon" onClick={handleClearVoice}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Duration: {formatTime(voice.duration || 0)}
                    {(voice.duration || 0) < 30 && <span className="text-destructive ml-2">(Minimum 30 seconds required)</span>}
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => voiceInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Different Audio
                  </Button>
                </div>
              ) : isUploadingVoice ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-muted-foreground">Uploading voice file...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Upload Zone */}
                  <div 
                    className="border-2 border-dashed border-primary/30 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer bg-primary/5"
                    onClick={() => voiceInputRef.current?.click()}
                  >
                    <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                      <Upload className="h-8 w-8 text-primary" />
                    </div>
                    <p className="font-medium text-lg mb-2">Upload Your Voice Recording</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      MP3, WAV, or M4A • 1-2 minutes • Max 50MB
                    </p>
                    <Button>
                      <FileAudio className="h-4 w-4 mr-2" />
                      Select Audio File
                    </Button>
                  </div>

                  {/* How to Record Guide */}
                  <div className="p-4 rounded-lg bg-muted space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Mic className="h-4 w-4 text-primary" />
                      How to Record Your Voice
                    </h4>
                    <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                      <li>Use <strong>Voice Memos</strong> (iPhone), <strong>Sound Recorder</strong> (Windows), or <strong>Audacity</strong> (free)</li>
                      <li>Find a quiet room with no echo or background noise</li>
                      <li>Speak naturally at a consistent volume for 1-2 minutes</li>
                      <li>Export as MP3 (192kbps+) or WAV for best quality</li>
                    </ol>
                  </div>

                  {/* Sample Script */}
                  <div className="p-4 rounded-lg border bg-card">
                    <p className="font-medium mb-2 text-sm">Sample script to read:</p>
                    <p className="text-sm text-muted-foreground italic">
                      "Hi, I'm excited to introduce you to EverLaunch, the AI-powered receptionist that can transform how your business handles customer calls. 
                      Imagine having a professional, friendly assistant available 24/7 to capture leads, answer questions, and schedule appointments. 
                      That's exactly what EverLaunch provides. Let me show you how it works and how it can help grow your business."
                    </p>
                  </div>
                </div>
              )}

              <input ref={voiceInputRef} type="file" accept="audio/*" onChange={handleVoiceUpload} className="hidden" />
              
              <p className="text-xs text-muted-foreground text-center">
                Voice file is saved automatically. You can safely switch tabs and return.
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 rounded-lg bg-muted">
                  <p className="font-medium mb-2">Photos</p>
                  <p className="text-sm text-muted-foreground">{photos.length}/5 uploaded</p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="font-medium mb-2">Voice</p>
                  <p className="text-sm text-muted-foreground">{voice ? `${formatTime(voice.duration || 0)} uploaded` : "Not provided"}</p>
                </div>
              </div>

              <Button className="w-full" size="lg" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Avatar...
                  </>
                ) : (
                  "Create AI Avatar"
                )}
              </Button>

              <div className="p-4 rounded-lg bg-muted text-sm text-muted-foreground">
                <p>
                  After submission, your avatar will be processed. This typically takes 10-30 minutes.
                  You'll be notified when it's ready for video creation.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        {step < 4 ? (
          <Button onClick={() => setStep((s) => Math.min(4, s + 1))} disabled={!canProceed()}>
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
