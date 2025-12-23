import { useState } from 'react';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { 
  useWhiteLabelConfig, 
  useThemePresets, 
  useFeatureToggles, 
  useCustomPages,
  useSaveWhiteLabelConfig,
  useSaveFeatureToggle,
  useSaveCustomPage,
  useDeleteCustomPage,
  DEFAULT_FEATURES,
  WhiteLabelConfig,
  CustomPage
} from '@/hooks/useWhiteLabel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Palette, 
  Globe, 
  Settings, 
  FileText, 
  Upload, 
  Check, 
  Eye,
  Trash2,
  Edit,
  Plus,
  ExternalLink,
  Mail,
  Phone,
  Shield,
  Loader2
} from 'lucide-react';

// Mock organization ID - in real app, get from auth context
const MOCK_ORG_ID = '00000000-0000-0000-0000-000000000001';

export default function WhiteLabelDashboard() {
  const { isEnabled } = useFeatureFlags();
  const [activeTab, setActiveTab] = useState('branding');
  const [showPageEditor, setShowPageEditor] = useState(false);
  const [editingPage, setEditingPage] = useState<CustomPage | null>(null);

  const { data: config, isLoading: configLoading } = useWhiteLabelConfig(MOCK_ORG_ID);
  const { data: presets } = useThemePresets();
  const { data: featureToggles } = useFeatureToggles(MOCK_ORG_ID);
  const { data: customPages } = useCustomPages(MOCK_ORG_ID);

  const saveConfig = useSaveWhiteLabelConfig();
  const saveFeatureToggle = useSaveFeatureToggle();
  const saveCustomPage = useSaveCustomPage();
  const deleteCustomPage = useDeleteCustomPage();

  // Form state
  const [formData, setFormData] = useState<Partial<WhiteLabelConfig>>({
    brand_name: '',
    custom_domain: '',
    logo_url: '',
    favicon_url: '',
    primary_color: '#1e40af',
    secondary_color: '#64748b',
    accent_color: '#0ea5e9',
    font_family: 'Inter',
    email_from_name: '',
    email_from_address: '',
    support_email: '',
    support_phone: '',
    custom_login_message: '',
    custom_login_tagline: '',
    hide_everlaunch_branding: false,
    custom_terms_url: '',
    custom_privacy_url: '',
    custom_css: '',
  });

  const [pageForm, setPageForm] = useState({
    page_title: '',
    page_slug: '',
    page_content: '',
    is_public: true,
    published: false,
  });

  // Initialize form with config data
  useState(() => {
    if (config) {
      setFormData(config);
    }
  });

  if (!isEnabled('aiCrmPhase4')) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">White-Label Features Coming Soon</h2>
            <p className="text-muted-foreground">
              Advanced white-label customization is part of AI CRM Phase 4.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSaveBranding = async () => {
    try {
      await saveConfig.mutateAsync({
        organization_id: MOCK_ORG_ID,
        brand_name: formData.brand_name || 'My CRM',
        ...formData,
      });
      toast.success('Branding settings saved');
    } catch (error) {
      toast.error('Failed to save branding');
    }
  };

  const handleToggleFeature = async (featureKey: string, enabled: boolean) => {
    try {
      await saveFeatureToggle.mutateAsync({
        organization_id: MOCK_ORG_ID,
        feature_key: featureKey,
        enabled,
      });
      toast.success(`Feature ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to update feature');
    }
  };

  const handleSavePage = async () => {
    try {
      await saveCustomPage.mutateAsync({
        organization_id: MOCK_ORG_ID,
        ...pageForm,
        id: editingPage?.id,
      });
      toast.success(editingPage ? 'Page updated' : 'Page created');
      setShowPageEditor(false);
      setEditingPage(null);
      setPageForm({ page_title: '', page_slug: '', page_content: '', is_public: true, published: false });
    } catch (error) {
      toast.error('Failed to save page');
    }
  };

  const handleDeletePage = async (page: CustomPage) => {
    try {
      await deleteCustomPage.mutateAsync({ id: page.id, organizationId: MOCK_ORG_ID });
      toast.success('Page deleted');
    } catch (error) {
      toast.error('Failed to delete page');
    }
  };

  const getFeatureEnabled = (featureKey: string) => {
    const toggle = featureToggles?.find(t => t.feature_key === featureKey);
    return toggle ? toggle.enabled : true;
  };

  const applyThemePreset = (preset: typeof presets extends (infer T)[] ? T : never) => {
    if (!preset) return;
    setFormData(prev => ({
      ...prev,
      primary_color: preset.colors?.primary || prev.primary_color,
      secondary_color: preset.colors?.secondary || prev.secondary_color,
      accent_color: preset.colors?.accent || prev.accent_color,
      font_family: preset.fonts?.body || prev.font_family,
      heading_font: preset.fonts?.heading || prev.heading_font,
    }));
    toast.success(`Applied ${preset.name} theme`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Palette className="h-8 w-8" />
            White-Label Configuration
          </h1>
          <p className="text-muted-foreground mt-1">
            Customize branding, domain, themes, and features for your organization
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="domain" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Domain
          </TabsTrigger>
          <TabsTrigger value="theme" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Theme
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Features
          </TabsTrigger>
        </TabsList>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand Identity</CardTitle>
              <CardDescription>Configure your brand name, logo, and contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="brand_name">Brand Name</Label>
                  <Input
                    id="brand_name"
                    value={formData.brand_name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, brand_name: e.target.value }))}
                    placeholder="Your CRM Name"
                  />
                  <p className="text-sm text-muted-foreground">Appears in UI, emails, and login page</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="font_family">Font Family</Label>
                  <Select 
                    value={formData.font_family || 'Inter'}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, font_family: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inter">Inter</SelectItem>
                      <SelectItem value="Roboto">Roboto</SelectItem>
                      <SelectItem value="Open Sans">Open Sans</SelectItem>
                      <SelectItem value="Lato">Lato</SelectItem>
                      <SelectItem value="Poppins">Poppins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Logo (Light Theme)</Label>
                  <div className="flex items-center gap-4">
                    <Button variant="outline" className="gap-2">
                      <Upload className="h-4 w-4" />
                      Upload Logo
                    </Button>
                    {formData.logo_url && (
                      <img src={formData.logo_url} alt="Logo" className="h-10" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">Recommended: 200x50px, PNG with transparency</p>
                </div>

                <div className="space-y-2">
                  <Label>Favicon</Label>
                  <div className="flex items-center gap-4">
                    <Button variant="outline" className="gap-2">
                      <Upload className="h-4 w-4" />
                      Upload Favicon
                    </Button>
                    {formData.favicon_url && (
                      <img src={formData.favicon_url} alt="Favicon" className="h-8 w-8" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">Recommended: 32x32px, ICO or PNG</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label>Hide "Powered by EverLaunch" Footer</Label>
                  <p className="text-sm text-muted-foreground">Remove EverLaunch branding from your application</p>
                </div>
                <Switch
                  checked={formData.hide_everlaunch_branding || false}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hide_everlaunch_branding: checked }))}
                />
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Contact Information
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="support_email">Support Email</Label>
                    <Input
                      id="support_email"
                      type="email"
                      value={formData.support_email || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, support_email: e.target.value }))}
                      placeholder="support@yourcompany.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="support_phone">Support Phone</Label>
                    <Input
                      id="support_phone"
                      value={formData.support_phone || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, support_phone: e.target.value }))}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Legal Documents</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="terms_url">Terms of Service URL</Label>
                    <Input
                      id="terms_url"
                      value={formData.custom_terms_url || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, custom_terms_url: e.target.value }))}
                      placeholder="https://yourcompany.com/terms"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="privacy_url">Privacy Policy URL</Label>
                    <Input
                      id="privacy_url"
                      value={formData.custom_privacy_url || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, custom_privacy_url: e.target.value }))}
                      placeholder="https://yourcompany.com/privacy"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveBranding} disabled={saveConfig.isPending}>
                  {saveConfig.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Branding
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Domain Tab */}
        <TabsContent value="domain" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Custom Domain Configuration</CardTitle>
              <CardDescription>Connect your own domain to fully white-label the platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Current Domain</p>
                    <p className="text-muted-foreground">acme.everlaunch.com</p>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <Check className="h-3 w-3" />
                    Active
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom_domain">Custom Domain</Label>
                <Input
                  id="custom_domain"
                  value={formData.custom_domain || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, custom_domain: e.target.value }))}
                  placeholder="crm.yourcompany.com"
                />
              </div>

              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-base">DNS Configuration</CardTitle>
                  <CardDescription>Add these DNS records at your domain registrar</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm space-y-2">
                    <div className="grid grid-cols-4 gap-4">
                      <span className="text-muted-foreground">Type:</span>
                      <span>CNAME</span>
                      <span className="text-muted-foreground">Name:</span>
                      <span>crm</span>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      <span className="text-muted-foreground">Value:</span>
                      <span className="col-span-3">custom.everlaunch.com</span>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      <span className="text-muted-foreground">TTL:</span>
                      <span>3600</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button variant="outline">Verify DNS</Button>
                <Button variant="outline">Test Domain</Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label>Auto-provision SSL Certificate</Label>
                  <p className="text-sm text-muted-foreground">Let's Encrypt certificate will be issued after domain verification</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Email Domain Configuration</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email_from">Send Emails From</Label>
                    <Input
                      id="email_from"
                      value={formData.email_from_address || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, email_from_address: e.target.value }))}
                      placeholder="notifications@yourcompany.com"
                    />
                  </div>
                  <Button variant="link" className="p-0 h-auto">
                    Show SPF & DKIM Configuration →
                  </Button>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveBranding} disabled={saveConfig.isPending}>
                  {saveConfig.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Domain Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Theme Tab */}
        <TabsContent value="theme" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Theme Customization</CardTitle>
              <CardDescription>Customize colors, typography, and styling</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="mb-3 block">Theme Presets</Label>
                <div className="grid grid-cols-4 gap-4">
                  {presets?.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => applyThemePreset(preset)}
                      className="p-4 border rounded-lg hover:border-primary transition-colors text-center"
                    >
                      <div 
                        className="w-12 h-12 rounded-full mx-auto mb-2"
                        style={{ backgroundColor: preset.colors?.primary || '#1e40af' }}
                      />
                      <p className="font-medium">{preset.name}</p>
                      <p className="text-xs text-muted-foreground">{preset.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t pt-6">
                <Label className="mb-3 block">Color Palette</Label>
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={formData.primary_color || '#1e40af'}
                        onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        value={formData.primary_color || '#1e40af'}
                        onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Buttons, links, accents</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={formData.secondary_color || '#64748b'}
                        onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        value={formData.secondary_color || '#64748b'}
                        onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Secondary buttons, borders</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Accent Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={formData.accent_color || '#0ea5e9'}
                        onChange={(e) => setFormData(prev => ({ ...prev, accent_color: e.target.value }))}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        value={formData.accent_color || '#0ea5e9'}
                        onChange={(e) => setFormData(prev => ({ ...prev, accent_color: e.target.value }))}
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Highlights, notifications</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <Label className="mb-3 block">Custom CSS</Label>
                <Textarea
                  value={formData.custom_css || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, custom_css: e.target.value }))}
                  placeholder="/* Add your custom styles here */"
                  className="font-mono h-40"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  ⚠️ Warning: Invalid CSS may break the UI
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline">Reset to Default</Button>
                <Button onClick={handleSaveBranding} disabled={saveConfig.isPending}>
                  {saveConfig.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Theme
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Feature Configuration</CardTitle>
              <CardDescription>Enable or disable features for your users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {['core', 'ai', 'automation', 'integrations'].map((category) => (
                <div key={category}>
                  <h3 className="font-semibold mb-4 capitalize">
                    {category === 'ai' ? 'AI-Powered Features' : 
                     category === 'core' ? 'Core Features' :
                     category === 'automation' ? 'Automation Features' :
                     'Integrations'}
                  </h3>
                  <div className="space-y-3">
                    {DEFAULT_FEATURES
                      .filter(f => f.category === category)
                      .map((feature) => {
                        const isEnabled = getFeatureEnabled(feature.key);
                        const toggle = featureToggles?.find(t => t.feature_key === feature.key);
                        
                        return (
                          <div 
                            key={feature.key} 
                            className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                          >
                            <div className="flex items-center gap-4">
                              <Switch
                                checked={isEnabled}
                                disabled={feature.alwaysEnabled}
                                onCheckedChange={(checked) => handleToggleFeature(feature.key, checked)}
                              />
                              <div>
                                <p className="font-medium">
                                  {toggle?.custom_label || feature.label}
                                </p>
                                {feature.alwaysEnabled && (
                                  <p className="text-xs text-muted-foreground">Always enabled (core functionality)</p>
                                )}
                              </div>
                            </div>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Custom Pages</CardTitle>
                <CardDescription>Create custom pages for your white-label site</CardDescription>
              </div>
              <Dialog open={showPageEditor} onOpenChange={setShowPageEditor}>
                <DialogTrigger asChild>
                  <Button className="gap-2" onClick={() => {
                    setEditingPage(null);
                    setPageForm({ page_title: '', page_slug: '', page_content: '', is_public: true, published: false });
                  }}>
                    <Plus className="h-4 w-4" />
                    New Page
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingPage ? 'Edit Page' : 'Create Page'}</DialogTitle>
                    <DialogDescription>
                      Create a custom page for your white-label site
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="page_title">Page Title</Label>
                      <Input
                        id="page_title"
                        value={pageForm.page_title}
                        onChange={(e) => setPageForm(prev => ({ ...prev, page_title: e.target.value }))}
                        placeholder="About Us"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="page_slug">URL Slug</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">/</span>
                        <Input
                          id="page_slug"
                          value={pageForm.page_slug}
                          onChange={(e) => setPageForm(prev => ({ ...prev, page_slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                          placeholder="about"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Visibility</Label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={pageForm.is_public}
                            onChange={() => setPageForm(prev => ({ ...prev, is_public: true }))}
                          />
                          Public
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={!pageForm.is_public}
                            onChange={() => setPageForm(prev => ({ ...prev, is_public: false }))}
                          />
                          Login Required
                        </label>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="page_content">Content (Markdown)</Label>
                      <Textarea
                        id="page_content"
                        value={pageForm.page_content}
                        onChange={(e) => setPageForm(prev => ({ ...prev, page_content: e.target.value }))}
                        placeholder="# Page Title\n\nYour content here..."
                        className="h-40 font-mono"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowPageEditor(false)}>
                        Cancel
                      </Button>
                      <Button variant="outline" onClick={() => setPageForm(prev => ({ ...prev, published: false }))}>
                        Save Draft
                      </Button>
                      <Button onClick={handleSavePage}>
                        {editingPage ? 'Update' : 'Publish'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {(!customPages || customPages.length === 0) ? (
                <p className="text-center text-muted-foreground py-8">
                  No custom pages yet. Click "New Page" to create one.
                </p>
              ) : (
                <div className="space-y-3">
                  {customPages.map((page) => (
                    <div key={page.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{page.page_title}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>/{page.page_slug}</span>
                          <span>•</span>
                          <span>{page.is_public ? 'Public' : 'Login required'}</span>
                          <span>•</span>
                          <span>{page.view_count} views</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={page.published ? 'default' : 'secondary'}>
                          {page.published ? 'Published' : 'Draft'}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setEditingPage(page);
                            setPageForm({
                              page_title: page.page_title,
                              page_slug: page.page_slug,
                              page_content: page.page_content,
                              is_public: page.is_public,
                              published: page.published,
                            });
                            setShowPageEditor(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeletePage(page)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
