import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentAffiliate } from '@/hooks/useCurrentAffiliate';
import { useAffiliateVideos } from '@/hooks/useAffiliateVideos';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Camera,
  Mic,
  Upload,
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Play,
  Square,
  Pause,
} from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Requirements', description: 'Review what you need' },
  { id: 2, title: 'Photos', description: 'Upload 5 photos' },
  { id: 3, title: 'Voice', description: 'Record your voice' },
  { id: 4, title: 'Submit', description: 'Create your avatar' },
];

const PHOTO_REQUIREMENTS = [
  'Clear, well-lit front-facing photo',
  'Looking directly at camera',
  'Neutral expression',
  'No sunglasses or hats',
  'Professional attire recommended',
];

export default function CreateAvatarProfile() {
  const navigate = useNavigate();
  const { affiliateId } = useCurrentAffiliate();
  const { createAvatarProfile, profile } = useAffiliateVideos();
  
  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceInputRef = useRef<HTMLInputElement>(null);

  // If profile already exists and is training/ready, redirect
  if (profile && (profile.status === 'training' || profile.status === 'ready')) {
    navigate('/affiliate/videos');
    return null;
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => f.type.startsWith('image/'));
    
    if (validFiles.length + photos.length > 5) {
      toast.error('Maximum 5 photos allowed');
      return;
    }

    setPhotos(prev => [...prev, ...validFiles].slice(0, 5));
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], 'voice-recording.webm', { type: 'audio/webm' });
        setVoiceFile(file);
        setVoiceUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      toast.error('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const handleVoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error('File too large. Maximum 50MB.');
        return;
      }
      setVoiceFile(file);
      setVoiceUrl(URL.createObjectURL(file));
    }
  };

  const clearVoice = () => {
    setVoiceFile(null);
    setVoiceUrl(null);
    setRecordingTime(0);
  };

  const uploadFiles = async () => {
    if (!affiliateId) return { photoUrls: [], voiceUrl: null };

    setIsUploading(true);
    const uploadedPhotoUrls: string[] = [];
    let uploadedVoiceUrl: string | null = null;

    try {
      // Upload photos
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const ext = photo.name.split('.').pop();
        const path = `${affiliateId}/photo-${i + 1}.${ext}`;
        
        const { error } = await supabase.storage
          .from('affiliate-photos')
          .upload(path, photo, { upsert: true });

        if (error) throw error;

        // Use signed URL (1 hour expiry) instead of public URL
        const { data: urlData, error: signedError } = await supabase.storage
          .from('affiliate-photos')
          .createSignedUrl(path, 3600);

        if (signedError || !urlData?.signedUrl) throw signedError || new Error('Failed to get signed URL');
        uploadedPhotoUrls.push(urlData.signedUrl);
      }

      // Upload voice
      if (voiceFile) {
        const ext = voiceFile.name.split('.').pop();
        const path = `${affiliateId}/voice.${ext}`;

        const { error } = await supabase.storage
          .from('affiliate-voices')
          .upload(path, voiceFile, { upsert: true });

        if (error) throw error;

        // Use signed URL (1 hour expiry) instead of public URL
        const { data: urlData, error: signedError } = await supabase.storage
          .from('affiliate-voices')
          .createSignedUrl(path, 3600);

        if (signedError || !urlData?.signedUrl) throw signedError || new Error('Failed to get signed URL');
        uploadedVoiceUrl = urlData.signedUrl;
      }

      setPhotoUrls(uploadedPhotoUrls);
      setVoiceUrl(uploadedVoiceUrl);
      return { photoUrls: uploadedPhotoUrls, voiceUrl: uploadedVoiceUrl };
    } catch (error: any) {
      toast.error('Failed to upload files: ' + error.message);
      return { photoUrls: [], voiceUrl: null };
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (photos.length < 5 || !voiceFile) {
      toast.error('Please upload 5 photos and a voice recording');
      return;
    }

    setIsSubmitting(true);

    try {
      const { photoUrls: urls, voiceUrl: voice } = await uploadFiles();
      
      if (urls.length !== 5 || !voice) {
        toast.error('Failed to upload all files');
        return;
      }

      const result = await createAvatarProfile(urls, voice);
      
      if (result) {
        navigate('/affiliate/videos');
      }
    } catch (error: any) {
      toast.error('Failed to create profile: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const canProceed = () => {
    switch (step) {
      case 1: return true;
      case 2: return photos.length === 5;
      case 3: return !!voiceFile && recordingTime >= 30;
      case 4: return photos.length === 5 && !!voiceFile;
      default: return false;
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" onClick={() => navigate('/affiliate/videos')} className="mb-4">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Videos
        </Button>
        <h1 className="text-2xl font-bold">Create AI Avatar</h1>
        <p className="text-muted-foreground">Set up your personalized AI avatar for video creation</p>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          {STEPS.map(s => (
            <div
              key={s.id}
              className={`flex items-center gap-2 ${step >= s.id ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium
                ${step > s.id ? 'bg-primary text-primary-foreground' : step === s.id ? 'bg-primary/20 text-primary border-2 border-primary' : 'bg-muted'}`}>
                {step > s.id ? <Check className="h-4 w-4" /> : s.id}
              </div>
              <span className="hidden sm:inline">{s.title}</span>
            </div>
          ))}
        </div>
        <Progress value={(step / 4) * 100} className="h-2" />
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[step - 1].title}</CardTitle>
          <CardDescription>{STEPS[step - 1].description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Requirements */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Camera className="h-5 w-5 text-primary" />
                    5 Photos Required
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {PHOTO_REQUIREMENTS.map((req, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Mic className="h-5 w-5 text-primary" />
                    Voice Recording
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      Minimum 30 seconds
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      Clear audio, minimal background noise
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      Natural speaking pace
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      Read any text naturally
                    </li>
                  </ul>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-500">Processing Time</p>
                    <p className="text-muted-foreground">
                      Avatar creation typically takes 10-30 minutes. You'll be notified when it's ready.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Photos */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                {[0, 1, 2, 3, 4].map(index => (
                  <div
                    key={index}
                    className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center relative overflow-hidden bg-muted/50"
                  >
                    {photos[index] ? (
                      <>
                        <img
                          src={URL.createObjectURL(photos[index])}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
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
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={photos.length >= 5}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Photos ({photos.length}/5)
              </Button>
            </div>
          )}

          {/* Step 3: Voice */}
          {step === 3 && (
            <div className="space-y-6">
              {voiceUrl ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted flex items-center gap-4">
                    <audio src={voiceUrl} controls className="flex-1" />
                    <Button variant="ghost" size="icon" onClick={clearVoice}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Duration: {formatTime(recordingTime)}
                    {recordingTime < 30 && (
                      <span className="text-amber-500 ml-2">(Minimum 30 seconds required)</span>
                    )}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-4 py-8">
                    <div className={`h-24 w-24 rounded-full flex items-center justify-center transition-colors
                      ${isRecording ? 'bg-destructive/20 animate-pulse' : 'bg-primary/20'}`}>
                      <Mic className={`h-12 w-12 ${isRecording ? 'text-destructive' : 'text-primary'}`} />
                    </div>
                    {isRecording && (
                      <p className="text-2xl font-mono">{formatTime(recordingTime)}</p>
                    )}
                    <div className="flex gap-2">
                      {isRecording ? (
                        <Button variant="destructive" onClick={stopRecording}>
                          <Square className="h-4 w-4 mr-2" />
                          Stop Recording
                        </Button>
                      ) : (
                        <Button onClick={startRecording}>
                          <Play className="h-4 w-4 mr-2" />
                          Start Recording
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Or upload an audio file</p>
                    <input
                      ref={voiceInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleVoiceUpload}
                      className="hidden"
                    />
                    <Button variant="outline" onClick={() => voiceInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Audio
                    </Button>
                  </div>
                </div>
              )}
              <div className="p-4 rounded-lg bg-muted text-sm text-muted-foreground">
                <p className="font-medium mb-2">Sample script to read:</p>
                <p className="italic">
                  "Hi, I'm excited to introduce you to EverLaunch, the AI-powered receptionist that can transform how your business handles customer calls. 
                  Imagine having a professional, friendly assistant available 24/7 to capture leads, answer questions, and schedule appointments. 
                  That's exactly what EverLaunch provides. Let me show you how it works and how it can help grow your business."
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Submit */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 rounded-lg bg-muted">
                  <h3 className="font-medium flex items-center gap-2 mb-2">
                    <Camera className="h-4 w-4" />
                    Photos
                  </h3>
                  <div className="flex gap-2">
                    {photos.map((photo, i) => (
                      <img
                        key={i}
                        src={URL.createObjectURL(photo)}
                        alt={`Photo ${i + 1}`}
                        className="h-12 w-12 rounded object-cover"
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {photos.length} photos ready
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <h3 className="font-medium flex items-center gap-2 mb-2">
                    <Mic className="h-4 w-4" />
                    Voice Recording
                  </h3>
                  {voiceUrl && (
                    <audio src={voiceUrl} controls className="w-full h-8" />
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatTime(recordingTime)} duration
                  </p>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm">
                  By submitting, your photos and voice will be used to create a personalized AI avatar. 
                  This avatar can then be used to generate marketing videos for your EverLaunch business.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(prev => prev - 1)}
          disabled={step === 1}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        {step < 4 ? (
          <Button
            onClick={() => setStep(prev => prev + 1)}
            disabled={!canProceed()}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!canProceed() || isSubmitting || isUploading}
          >
            {isSubmitting || isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isUploading ? 'Uploading...' : 'Creating...'}
              </>
            ) : (
              <>
                Create Avatar
                <Check className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
