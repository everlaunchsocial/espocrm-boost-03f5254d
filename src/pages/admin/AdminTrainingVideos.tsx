import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { 
  Play, 
  Loader2, 
  Check, 
  Search, 
  Filter, 
  RefreshCw,
  Video,
  ChevronDown,
  Volume2,
  VolumeX,
  Link2,
  LinkIcon,
  BookOpen,
  FileText,
  Target,
  AlertCircle,
  Lightbulb,
  MapPin,
} from "lucide-react";
import { useTrainingLibrary } from "@/hooks/useTrainingLibrary";
import { TrainingLibraryEntry, TRAINING_TYPE_LABELS, TRAINING_TYPE_COLORS } from "@/types/trainingLibrary";

interface Avatar {
  avatar_id: string;
  name: string;
  gender: string;
  preview_image_url: string | null;
  preview_video_url: string | null;
  is_premium: boolean;
  tags: string[];
  default_voice_id: string | null;
  default_voice_name: string | null;
}

interface Voice {
  voice_id: string;
  name: string;
  language: string;
  gender: string;
  preview_audio_url: string | null;
  is_premium: boolean;
}

interface TrainingVideo {
  id: string;
  title: string;
  script_text: string;
  avatar_id: string;
  avatar_name: string | null;
  voice_id: string;
  voice_name: string | null;
  vertical: string | null;
  status: string;
  heygen_video_id: string | null;
  video_url: string | null;
  error_message: string | null;
  estimated_cost_usd: number | null;
  linked_vertical_id: string | null;
  training_library_id: string | null;
  created_at: string;
}

export default function AdminTrainingVideos() {
  const queryClient = useQueryClient();
  const { entries: trainingLibraryEntries, isLoading: libraryLoading } = useTrainingLibrary();
  
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [selectedTrainingId, setSelectedTrainingId] = useState<string>('');
  const [selectedTraining, setSelectedTraining] = useState<TrainingLibraryEntry | null>(null);
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(12);
  const [hoveredAvatarId, setHoveredAvatarId] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  // Fetch avatars
  const { data: avatarsData, isLoading: avatarsLoading, refetch: refetchAvatars } = useQuery({
    queryKey: ['heygen-avatars'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('heygen-list-avatars');
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data.avatars as Avatar[];
    },
  });

  // Fetch voices
  const { data: voicesData, isLoading: voicesLoading } = useQuery({
    queryKey: ['heygen-voices'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('heygen-list-voices');
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data.voices as Voice[];
    },
  });

  // Fetch existing training videos
  const { data: trainingVideos, isLoading: videosLoading, refetch: refetchVideos } = useQuery({
    queryKey: ['training-videos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_videos')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as TrainingVideo[];
    },
  });

  // Update selectedTraining when selection changes
  useEffect(() => {
    if (selectedTrainingId) {
      const training = trainingLibraryEntries.find(t => t.id === selectedTrainingId);
      setSelectedTraining(training || null);
    } else {
      setSelectedTraining(null);
    }
  }, [selectedTrainingId, trainingLibraryEntries]);

  // Generate video mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAvatar || !selectedVoice || !selectedTraining) {
        throw new Error('Please select a training and configure avatar/voice');
      }

      const { data, error } = await supabase.functions.invoke('generate-training-video', {
        body: {
          training_library_id: selectedTraining.id,
          avatar_id: selectedAvatar.avatar_id,
          avatar_name: selectedAvatar.name,
          voice_id: selectedVoice.voice_id,
          voice_name: selectedVoice.name,
          // Script loaded server-side from training_library
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success('Video generation started!', {
        description: `Estimated cost: $${data.estimated_cost_usd?.toFixed(2)}`,
      });
      queryClient.invalidateQueries({ queryKey: ['training-videos'] });
      // Reset selection
      setSelectedTrainingId('');
      setSelectedTraining(null);
    },
    onError: (error) => {
      toast.error('Failed to generate video', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  // Filter avatars
  const filteredAvatars = (avatarsData || []).filter((avatar) => {
    if (genderFilter !== 'all' && avatar.gender !== genderFilter) return false;
    if (searchQuery && !avatar.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const visibleAvatars = filteredAvatars.slice(0, visibleCount);
  const hasMore = visibleCount < filteredAvatars.length;

  // When avatar is selected, set default voice
  useEffect(() => {
    if (selectedAvatar?.default_voice_id && voicesData) {
      const defaultVoice = voicesData.find(v => v.voice_id === selectedAvatar.default_voice_id);
      if (defaultVoice) {
        setSelectedVoice(defaultVoice);
      }
    }
  }, [selectedAvatar, voicesData]);

  const playVoicePreview = (voice: Voice, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!voice.preview_audio_url) {
      toast.info('No preview available for this voice');
      return;
    }
    
    // Stop current audio if playing
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    
    // If clicking the same voice, just stop
    if (playingAudioId === voice.voice_id) {
      setPlayingAudioId(null);
      setCurrentAudio(null);
      return;
    }

    const audio = new Audio(voice.preview_audio_url);
    audio.onended = () => {
      setPlayingAudioId(null);
      setCurrentAudio(null);
    };
    audio.play();
    setPlayingAudioId(voice.voice_id);
    setCurrentAudio(audio);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'processing': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTrainingName = (libraryId: string | null) => {
    if (!libraryId) return null;
    return trainingLibraryEntries.find(t => t.id === libraryId)?.title || null;
  };

  // Group training entries by vertical for dropdown
  const groupedTrainings = trainingLibraryEntries.reduce((acc, entry) => {
    const key = entry.vertical_key || '__general__';
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {} as Record<string, TrainingLibraryEntry[]>);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Training Video Generator</h1>
          <p className="text-muted-foreground">
            Create training videos from the Training Library
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/training-library">
              <BookOpen className="h-4 w-4 mr-2" />
              Training Library
            </Link>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetchVideos()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Queue
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetchAvatars()}
            disabled={avatarsLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${avatarsLoading ? 'animate-spin' : ''}`} />
            Refresh Avatars
          </Button>
        </div>
      </div>

      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList>
          <TabsTrigger value="generate">Generate Video</TabsTrigger>
          <TabsTrigger value="queue">
            Video Queue {trainingVideos?.length ? `(${trainingVideos.length})` : ''}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          {/* Step 1: Select Training from Library */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">1</span>
                </div>
                <h2 className="text-lg font-semibold">Select Training from Library</h2>
                {libraryLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              </div>

              <Select value={selectedTrainingId} onValueChange={setSelectedTrainingId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a training to generate video for..." />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {Object.entries(groupedTrainings)
                    .sort(([a], [b]) => {
                      if (a === '__general__') return 1;
                      if (b === '__general__') return -1;
                      return a.localeCompare(b);
                    })
                    .map(([verticalKey, entries]) => (
                      <div key={verticalKey}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
                          {verticalKey === '__general__' ? 'General' : verticalKey.replace(/-/g, ' ')}
                        </div>
                        {entries.map((entry) => (
                          <SelectItem key={entry.id} value={entry.id}>
                            <div className="flex items-center gap-2">
                              <Badge className={`${TRAINING_TYPE_COLORS[entry.training_type]} text-xs`}>
                                {TRAINING_TYPE_LABELS[entry.training_type]}
                              </Badge>
                              <span>{entry.title}</span>
                              <span className="text-xs text-muted-foreground">v{entry.script_version}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  {trainingLibraryEntries.length === 0 && (
                    <div className="p-4 text-center text-muted-foreground">
                      No training entries found.{' '}
                      <Link to="/admin/training-library" className="text-primary hover:underline">
                        Create one first
                      </Link>
                    </div>
                  )}
                </SelectContent>
              </Select>

              {/* Preview Selected Training */}
              {selectedTraining && (
                <div className="mt-4 p-4 border rounded-lg space-y-4 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{selectedTraining.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={TRAINING_TYPE_COLORS[selectedTraining.training_type]}>
                          {TRAINING_TYPE_LABELS[selectedTraining.training_type]}
                        </Badge>
                        {selectedTraining.vertical_key && (
                          <Badge variant="outline" className="capitalize">
                            {selectedTraining.vertical_key}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {selectedTraining.script.split(/\s+/).length} words • 
                          ~${((selectedTraining.script.split(/\s+/).length / 150) * 3).toFixed(2)} estimated
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Sections */}
                  <Accordion type="multiple" className="w-full">
                    <AccordionItem value="script">
                      <AccordionTrigger className="text-sm">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Script Preview
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap max-h-48 overflow-y-auto">
                          {selectedTraining.script}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {selectedTraining.why_priority.length > 0 && (
                      <AccordionItem value="priority">
                        <AccordionTrigger className="text-sm">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Why Priority ({selectedTraining.why_priority.length})
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                            {selectedTraining.why_priority.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {selectedTraining.pain_points.length > 0 && (
                      <AccordionItem value="pain">
                        <AccordionTrigger className="text-sm">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            Pain Points ({selectedTraining.pain_points.length})
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                            {selectedTraining.pain_points.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {selectedTraining.why_phone_ai_fits.length > 0 && (
                      <AccordionItem value="fits">
                        <AccordionTrigger className="text-sm">
                          <div className="flex items-center gap-2">
                            <Lightbulb className="h-4 w-4" />
                            Why Phone AI Fits ({selectedTraining.why_phone_ai_fits.length})
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                            {selectedTraining.why_phone_ai_fits.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {selectedTraining.where_to_find.length > 0 && (
                      <AccordionItem value="find">
                        <AccordionTrigger className="text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Where to Find ({selectedTraining.where_to_find.length})
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                            {selectedTraining.where_to_find.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2 & 3: Avatar + Voice Selection */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Avatar Selection - Left 2/3 */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">2</span>
                    </div>
                    <h2 className="text-lg font-semibold">Select Avatar</h2>
                    
                    {/* Filters */}
                    <div className="flex items-center gap-2 ml-auto">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search avatars..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 w-48"
                        />
                      </div>
                      
                      <Select value={genderFilter} onValueChange={setGenderFilter}>
                        <SelectTrigger className="w-32">
                          <Filter className="h-4 w-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {avatarsLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      {/* 4x3 Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {visibleAvatars.map((avatar) => (
                          <div
                            key={avatar.avatar_id}
                            className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                              selectedAvatar?.avatar_id === avatar.avatar_id
                                ? 'border-primary ring-2 ring-primary/20'
                                : 'border-border hover:border-primary/50'
                            }`}
                            onClick={() => setSelectedAvatar(avatar)}
                            onMouseEnter={() => setHoveredAvatarId(avatar.avatar_id)}
                            onMouseLeave={() => setHoveredAvatarId(null)}
                          >
                            {/* Preview Image / Video */}
                            <div className="aspect-square bg-muted relative">
                              {hoveredAvatarId === avatar.avatar_id && avatar.preview_video_url ? (
                                <video
                                  src={avatar.preview_video_url}
                                  autoPlay
                                  muted
                                  loop
                                  className="absolute inset-0 w-full h-full object-cover"
                                />
                              ) : avatar.preview_image_url ? (
                                <img
                                  src={avatar.preview_image_url}
                                  alt={avatar.name}
                                  className="absolute inset-0 w-full h-full object-cover"
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Video className="h-8 w-8 text-muted-foreground" />
                                </div>
                              )}

                              {/* Selected checkmark */}
                              {selectedAvatar?.avatar_id === avatar.avatar_id && (
                                <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                                  <Check className="h-3 w-3 text-primary-foreground" />
                                </div>
                              )}

                              {/* Premium badge */}
                              {avatar.is_premium && (
                                <Badge className="absolute top-2 left-2 bg-amber-500/90 text-white text-xs">
                                  Premium
                                </Badge>
                              )}
                            </div>

                            {/* Info */}
                            <div className="p-2 bg-card">
                              <p className="text-sm font-medium truncate">{avatar.name}</p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {avatar.gender}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Load More */}
                      {hasMore && (
                        <div className="flex justify-center mt-4">
                          <Button
                            variant="outline"
                            onClick={() => setVisibleCount((c) => c + 12)}
                          >
                            <ChevronDown className="h-4 w-4 mr-2" />
                            Load More ({filteredAvatars.length - visibleCount} remaining)
                          </Button>
                        </div>
                      )}

                      {filteredAvatars.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          No avatars found matching your criteria
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Configuration Panel - Right 1/3 */}
            <div className="space-y-4">
              {/* Selected Avatar Preview */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-3">Selected Avatar</h3>
                  {selectedAvatar ? (
                    <div className="flex items-center gap-3">
                      <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted">
                        {selectedAvatar.preview_image_url ? (
                          <img
                            src={selectedAvatar.preview_image_url}
                            alt={selectedAvatar.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Video className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{selectedAvatar.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {selectedAvatar.gender}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Click an avatar to select
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Voice Selection */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">3</span>
                    </div>
                    <h3 className="font-semibold">Voice</h3>
                  </div>
                  <Select
                    value={selectedVoice?.voice_id || ''}
                    onValueChange={(val) => {
                      const voice = voicesData?.find((v) => v.voice_id === val);
                      setSelectedVoice(voice || null);
                    }}
                    disabled={voicesLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a voice..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {(voicesData || []).map((voice) => (
                        <SelectItem key={voice.voice_id} value={voice.voice_id}>
                          <div className="flex items-center justify-between w-full gap-3">
                            <div className="flex items-center gap-2">
                              <span>{voice.name}</span>
                              <span className="text-xs text-muted-foreground capitalize">
                                ({voice.gender})
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => playVoicePreview(voice, e)}
                              className={`p-1 rounded hover:bg-accent transition-colors ${
                                playingAudioId === voice.voice_id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                              }`}
                              title={voice.preview_audio_url ? 'Preview voice' : 'No preview available'}
                            >
                              {playingAudioId === voice.voice_id ? (
                                <VolumeX className="h-4 w-4" />
                              ) : (
                                <Volume2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedVoice && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-3 w-3 text-green-500" />
                      Selected: {selectedVoice.name}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Generate Button */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-3">Ready to Generate</h3>
                  
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center gap-2">
                      {selectedTraining ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                      )}
                      <span className={selectedTraining ? '' : 'text-muted-foreground'}>
                        Training selected
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedAvatar ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                      )}
                      <span className={selectedAvatar ? '' : 'text-muted-foreground'}>
                        Avatar selected
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedVoice ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                      )}
                      <span className={selectedVoice ? '' : 'text-muted-foreground'}>
                        Voice selected
                      </span>
                    </div>
                  </div>

                  {selectedTraining && (
                    <p className="text-xs text-muted-foreground mb-4">
                      Estimated cost: ~${((selectedTraining.script.split(/\s+/).length / 150) * 3).toFixed(2)}
                    </p>
                  )}

                  <Button
                    className="w-full"
                    onClick={() => generateMutation.mutate()}
                    disabled={!selectedAvatar || !selectedVoice || !selectedTraining || generateMutation.isPending}
                  >
                    {generateMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Generate Video
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="queue">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-4">Generated Videos</h2>
              
              {videosLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : trainingVideos?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No videos generated yet. Create your first one above!
                </div>
              ) : (
                <div className="space-y-3">
                  {trainingVideos?.map((video) => (
                    <div
                      key={video.id}
                      className="flex items-center gap-4 p-4 border rounded-lg"
                    >
                      <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                        <Video className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{video.title}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{video.avatar_name || video.avatar_id} • {video.voice_name || video.voice_id}</span>
                          {video.training_library_id && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <LinkIcon className="h-3 w-3" />
                                {getTrainingName(video.training_library_id) || 'Linked'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {video.vertical && (
                          <Badge variant="outline">{video.vertical}</Badge>
                        )}
                        <Badge className={getStatusColor(video.status)}>
                          {video.status}
                        </Badge>
                        {video.video_url && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={video.video_url} target="_blank" rel="noopener noreferrer">
                              <Play className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
