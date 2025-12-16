import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Video,
  User,
  FileText,
  Plus,
  Edit2,
  Trash2,
  Eye,
  MousePointer,
  DollarSign,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface AvatarProfile {
  id: string;
  affiliate_id: string;
  status: string;
  created_at: string;
  affiliates: { username: string };
}

interface AffiliateVideo {
  id: string;
  video_name: string;
  video_type: string;
  status: string;
  landing_page_slug: string | null;
  estimated_cost_usd: number | null;
  created_at: string;
  affiliates: { username: string };
}

interface VideoTemplate {
  id: string;
  name: string;
  video_type: string;
  script_text: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminAffiliateVideos() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<AvatarProfile[]>([]);
  const [videos, setVideos] = useState<AffiliateVideo[]>([]);
  const [templates, setTemplates] = useState<VideoTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<VideoTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    video_type: 'recruitment',
    script_text: '',
    is_active: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch profiles
      const { data: profilesData } = await supabase
        .from('affiliate_avatar_profiles')
        .select('id, affiliate_id, status, created_at, affiliates(username)')
        .order('created_at', { ascending: false });

      setProfiles((profilesData as any[]) || []);

      // Fetch videos
      const { data: videosData } = await supabase
        .from('affiliate_videos')
        .select('id, video_name, video_type, status, landing_page_slug, estimated_cost_usd, created_at, affiliates(username)')
        .order('created_at', { ascending: false });

      setVideos((videosData as any[]) || []);

      // Fetch templates
      const { data: templatesData } = await supabase
        .from('video_script_templates')
        .select('*')
        .order('created_at', { ascending: false });

      setTemplates((templatesData || []) as unknown as VideoTemplate[]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEditTemplate = (template: VideoTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      video_type: template.video_type,
      script_text: template.script_text,
      is_active: template.is_active,
    });
    setShowTemplateModal(true);
  };

  const handleNewTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: '',
      video_type: 'recruitment',
      script_text: '',
      is_active: true,
    });
    setShowTemplateModal(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.name || !templateForm.script_text) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSaving(true);
    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from('video_script_templates')
          .update({
            name: templateForm.name,
            script_text: templateForm.script_text,
            is_active: templateForm.is_active,
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;
        toast.success('Template updated');
      } else {
        const { error } = await supabase
          .from('video_script_templates')
          .insert([{
            name: templateForm.name,
            video_type: templateForm.video_type as any,
            script_text: templateForm.script_text,
            is_active: templateForm.is_active,
          }]);

        if (error) throw error;
        toast.success('Template created');
      }

      setShowTemplateModal(false);
      fetchData();
    } catch (error: any) {
      toast.error('Failed to save template: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('video_script_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Template deleted');
      fetchData();
    } catch (error: any) {
      toast.error('Failed to delete: ' + error.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge className="bg-green-500/20 text-green-400"><CheckCircle2 className="h-3 w-3 mr-1" />Ready</Badge>;
      case 'processing':
      case 'generating':
        return <Badge className="bg-amber-500/20 text-amber-400"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case 'pending':
        return <Badge className="bg-blue-500/20 text-blue-400"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'failed':
        return <Badge className="bg-destructive/20 text-destructive"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalCost = videos.reduce((sum, v) => sum + (v.estimated_cost_usd || 0), 0);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Affiliate Videos Admin</h1>
          <p className="text-muted-foreground">Manage avatar profiles, videos, and templates</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => navigate('/admin/affiliate-videos/create-profile')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Avatar Profile
          </Button>
          <Button onClick={() => navigate('/admin/affiliate-videos/create-video')}>
            <Video className="h-4 w-4 mr-2" />
            Create Video
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{profiles.length}</p>
                <p className="text-sm text-muted-foreground">Avatar Profiles</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Video className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{videos.length}</p>
                <p className="text-sm text-muted-foreground">Videos Generated</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{templates.filter(t => t.is_active).length}</p>
                <p className="text-sm text-muted-foreground">Active Templates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">${totalCost.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Total Cost</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profiles">
        <TabsList>
          <TabsTrigger value="profiles">Avatar Profiles</TabsTrigger>
          <TabsTrigger value="videos">Videos</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="profiles" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Avatar Profiles</CardTitle>
              <CardDescription>All affiliate avatar profiles</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Affiliate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map(profile => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">
                        {profile.affiliates?.username || 'Unknown'}
                      </TableCell>
                      <TableCell>{getStatusBadge(profile.status)}</TableCell>
                      <TableCell>{new Date(profile.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {profiles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        No avatar profiles yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="videos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Generated Videos</CardTitle>
              <CardDescription>All affiliate videos</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Affiliate</TableHead>
                    <TableHead>Video Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {videos.map(video => (
                    <TableRow key={video.id}>
                      <TableCell className="font-medium">
                        {video.affiliates?.username || 'Unknown'}
                      </TableCell>
                      <TableCell>{video.video_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{video.video_type}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(video.status)}</TableCell>
                      <TableCell>
                        {video.estimated_cost_usd ? `$${video.estimated_cost_usd.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>{new Date(video.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {videos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No videos generated yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Script Templates</CardTitle>
                <CardDescription>Manage video script templates</CardDescription>
              </div>
              <Button onClick={handleNewTemplate}>
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map(template => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{template.video_type}</Badge>
                      </TableCell>
                      <TableCell>
                        {template.is_active ? (
                          <Badge className="bg-green-500/20 text-green-400">Active</Badge>
                        ) : (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>{new Date(template.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => handleEditTemplate(template)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteTemplate(template.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {templates.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No templates yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Modal */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'New Template'}</DialogTitle>
            <DialogDescription>
              {editingTemplate ? 'Update the script template' : 'Create a new video script template'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                value={templateForm.name}
                onChange={e => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Recruitment Pitch v1"
              />
            </div>
            <div className="space-y-2">
              <Label>Video Type</Label>
              <Select
                value={templateForm.video_type}
                onValueChange={value => setTemplateForm(prev => ({ ...prev, video_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recruitment">Recruitment</SelectItem>
                  <SelectItem value="attorney">Attorney/Legal</SelectItem>
                  <SelectItem value="dentist">Dental Practice</SelectItem>
                  <SelectItem value="salon">Salon/Spa</SelectItem>
                  <SelectItem value="plumber">Home Services</SelectItem>
                  <SelectItem value="product_sales">Product Sales</SelectItem>
                  <SelectItem value="testimonial">Testimonial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Script Template</Label>
              <Textarea
                value={templateForm.script_text}
                onChange={e => setTemplateForm(prev => ({ ...prev, script_text: e.target.value }))}
                placeholder="Enter the full video script..."
                rows={10}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={templateForm.is_active}
                onCheckedChange={checked => setTemplateForm(prev => ({ ...prev, is_active: checked }))}
              />
              <Label>Active (visible to affiliates)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingTemplate ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
