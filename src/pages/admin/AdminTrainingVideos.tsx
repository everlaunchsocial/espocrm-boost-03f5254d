import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
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
  Link2,
  LinkIcon
} from "lucide-react";

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

interface VerticalTraining {
  id: string;
  industry_name: string;
  rank: number;
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
  created_at: string;
}

export default function AdminTrainingVideos() {
  const queryClient = useQueryClient();
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(12);
  const [scriptText, setScriptText] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [selectedVerticalId, setSelectedVerticalId] = useState<string>('');
  const [hoveredAvatarId, setHoveredAvatarId] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // Fetch vertical_training entries for dropdown
  const { data: verticalTrainings } = useQuery({
    queryKey: ['vertical-trainings-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vertical_training')
        .select('id, industry_name, rank')
        .order('rank', { ascending: true });
      if (error) throw error;
      return data as VerticalTraining[];
    },
  });

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

  // Generate video mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAvatar || !selectedVoice || !scriptText || !videoTitle) {
        throw new Error('Please fill in all required fields');
      }

      // Find selected vertical name for the vertical field
      const selectedVertical = verticalTrainings?.find(v => v.id === selectedVerticalId);

      const { data, error } = await supabase.functions.invoke('generate-training-video', {
        body: {
          avatar_id: selectedAvatar.avatar_id,
          avatar_name: selectedAvatar.name,
          voice_id: selectedVoice.voice_id,
          voice_name: selectedVoice.name,
          script_text: scriptText,
          title: videoTitle,
          vertical: selectedVertical?.industry_name || null,
          linked_vertical_id: selectedVerticalId || null,
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
      // Reset form
      setScriptText('');
      setVideoTitle('');
      setSelectedVerticalId('');
    },
    onError: (error) => {
      toast.error('Failed to generate video', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  // Link video to vertical mutation
  const linkVerticalMutation = useMutation({
    mutationFn: async ({ videoId, verticalId }: { videoId: string; verticalId: string | null }) => {
      // Update training_videos with linked_vertical_id
      const { error: updateError } = await supabase
        .from('training_videos')
        .update({ linked_vertical_id: verticalId })
        .eq('id', videoId);
      
      if (updateError) throw updateError;

      // If linking to a vertical, also update vertical_training.video_path
      if (verticalId) {
        const video = trainingVideos?.find(v => v.id === videoId);
        if (video?.video_url) {
          const { error: verticalError } = await supabase
            .from('vertical_training')
            .update({ video_path: video.video_url })
            .eq('id', verticalId);
          
          if (verticalError) throw verticalError;
        }
      }
    },
    onSuccess: () => {
      toast.success('Video linked to vertical');
      queryClient.invalidateQueries({ queryKey: ['training-videos'] });
      queryClient.invalidateQueries({ queryKey: ['vertical-trainings-admin'] });
    },
    onError: (error) => {
      toast.error('Failed to link video', {
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

  const playVoicePreview = (voice: Voice) => {
    if (!voice.preview_audio_url) return;
    
    if (playingAudioId === voice.voice_id) {
      setPlayingAudioId(null);
      return;
    }

    const audio = new Audio(voice.preview_audio_url);
    audio.onended = () => setPlayingAudioId(null);
    audio.play();
    setPlayingAudioId(voice.voice_id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'processing': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getVerticalName = (verticalId: string | null) => {
    if (!verticalId) return null;
    return verticalTrainings?.find(v => v.id === verticalId)?.industry_name || null;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Training Video Generator</h1>
          <p className="text-muted-foreground">
            Create training videos using HeyGen stock avatars
          </p>
        </div>
        <div className="flex gap-2">
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Avatar Selection - Left 2/3 */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4 mb-4">
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
                  <h3 className="font-semibold mb-3">Voice</h3>
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
                          <div className="flex items-center gap-2">
                            <span>{voice.name}</span>
                            <span className="text-xs text-muted-foreground capitalize">
                              ({voice.gender})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedVoice?.preview_audio_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => playVoicePreview(selectedVoice)}
                    >
                      <Volume2 className="h-4 w-4 mr-2" />
                      {playingAudioId === selectedVoice.voice_id ? 'Playing...' : 'Preview Voice'}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Video Details */}
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <h3 className="font-semibold">Video Details</h3>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">Title</label>
                    <Input
                      placeholder="e.g., Core Training — Plumbing"
                      value={videoTitle}
                      onChange={(e) => setVideoTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Link to Vertical Training
                      <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                    </label>
                    <Select 
                      value={selectedVerticalId || '__none__'} 
                      onValueChange={(val) => setSelectedVerticalId(val === '__none__' ? '' : val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a vertical to link..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No link</SelectItem>
                        {(verticalTrainings || []).map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            #{v.rank} — {v.industry_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      When video completes, it will auto-link to this vertical's training page
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Script</label>
                    <Textarea
                      placeholder="Enter the script for your training video..."
                      value={scriptText}
                      onChange={(e) => setScriptText(e.target.value)}
                      rows={6}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {scriptText.split(/\s+/).filter(Boolean).length} words
                      {scriptText && ` (~$${((scriptText.split(/\s+/).filter(Boolean).length / 150) * 3).toFixed(2)} estimated)`}
                    </p>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => generateMutation.mutate()}
                    disabled={!selectedAvatar || !selectedVoice || !scriptText || !videoTitle || generateMutation.isPending}
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
                        <p className="text-sm text-muted-foreground">
                          {video.avatar_name || video.avatar_id} • {video.voice_name || video.voice_id}
                        </p>
                      </div>
                      
                      {/* Vertical Link Control */}
                      <div className="flex items-center gap-2">
                        <Select
                          value={video.linked_vertical_id || '__none__'}
                          onValueChange={(val) => linkVerticalMutation.mutate({ 
                            videoId: video.id, 
                            verticalId: val === '__none__' ? null : val 
                          })}
                          disabled={video.status !== 'ready'}
                        >
                          <SelectTrigger className="w-48">
                            {video.linked_vertical_id ? (
                              <div className="flex items-center gap-1">
                                <LinkIcon className="h-3 w-3 text-green-500" />
                                <span className="truncate">{getVerticalName(video.linked_vertical_id)}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Link to vertical...</span>
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Unlink</SelectItem>
                            {(verticalTrainings || []).map((v) => (
                              <SelectItem key={v.id} value={v.id}>
                                #{v.rank} — {v.industry_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-3">
                        {video.vertical && !video.linked_vertical_id && (
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