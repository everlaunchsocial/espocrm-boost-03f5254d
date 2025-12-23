import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Plus, 
  Edit, 
  Copy, 
  FlaskConical, 
  ChevronDown,
  ChevronRight,
  Mail,
  BarChart3,
  Eye,
  MousePointer,
  Reply,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { toast } from "sonner";
import { 
  useTemplatesWithStats, 
  useCreateTemplate,
  useUpdateTemplate,
  useCreateVariant,
  useTemplateVariants,
  TEMPLATE_CATEGORIES,
  TEMPLATE_VARIABLES,
  TemplateWithStats,
  EmailTemplate,
  getCategoryLabel,
  getPerformanceColor,
  personalizeTemplate
} from "@/hooks/useEmailTemplates";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

export default function EmailTemplates() {
  const isEnabled = useFeatureFlags(state => state.isEnabled);
  const aiCrmPhase4 = isEnabled('aiCrmPhase4');
  const { data: templates, isLoading } = useTemplatesWithStats();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const createVariant = useCreateVariant();

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateWithStats | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isNewTemplate, setIsNewTemplate] = useState(false);
  const [isABTestOpen, setIsABTestOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(TEMPLATE_CATEGORIES.map(c => c.value));
  const [previewMode, setPreviewMode] = useState(false);

  const [editForm, setEditForm] = useState({
    name: '',
    category: 'cold_outreach' as EmailTemplate['category'],
    subject_line: '',
    body_html: '',
    body_plain: '',
    variables: [] as string[],
    is_global: false,
  });

  const [abTestForm, setAbTestForm] = useState({
    variant_name: 'B',
    subject_line: '',
    body_html: '',
    body_plain: '',
    weight: 50,
  });

  // Sample data for preview
  const sampleData = {
    first_name: 'Sarah',
    last_name: 'Johnson',
    company: "Joe's Pizza",
    industry: 'Restaurant',
    sender_name: 'John',
    demo_link: 'https://demo.example.com/xyz',
    calendar_link: 'https://cal.example.com/book',
    pain_point: 'missed calls during dinner rush',
    connection: 'Mike from the Chamber',
    call_summary: 'Discussed AI phone solutions',
    next_steps: 'Schedule a demo next week',
    offer_details: '30-day free trial',
  };

  if (!aiCrmPhase4) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Email Templates feature is not enabled.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const templatesByCategory = templates?.reduce((acc, template) => {
    if (!acc[template.category]) acc[template.category] = [];
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, TemplateWithStats[]>) || {};

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const openEditor = (template?: TemplateWithStats) => {
    if (template) {
      setSelectedTemplate(template);
      setEditForm({
        name: template.name,
        category: template.category,
        subject_line: template.subject_line,
        body_html: template.body_html,
        body_plain: template.body_plain,
        variables: template.variables || [],
        is_global: template.is_global,
      });
      setIsNewTemplate(false);
    } else {
      setSelectedTemplate(null);
      setEditForm({
        name: '',
        category: 'cold_outreach',
        subject_line: '',
        body_html: '',
        body_plain: '',
        variables: [],
        is_global: false,
      });
      setIsNewTemplate(true);
    }
    setPreviewMode(false);
    setIsEditorOpen(true);
  };

  const handleSaveTemplate = async () => {
    try {
      if (isNewTemplate) {
        await createTemplate.mutateAsync({
          ...editForm,
          is_active: true,
          created_by: null,
        });
        toast.success('Template created successfully');
      } else if (selectedTemplate) {
        await updateTemplate.mutateAsync({
          id: selectedTemplate.id,
          ...editForm,
        });
        toast.success('Template updated successfully');
      }
      setIsEditorOpen(false);
    } catch (error) {
      toast.error('Failed to save template');
    }
  };

  const handleDuplicate = async (template: TemplateWithStats) => {
    try {
      await createTemplate.mutateAsync({
        name: `${template.name} (Copy)`,
        category: template.category,
        subject_line: template.subject_line,
        body_html: template.body_html,
        body_plain: template.body_plain,
        variables: template.variables,
        is_active: true,
        is_global: false,
        created_by: null,
      });
      toast.success('Template duplicated');
    } catch (error) {
      toast.error('Failed to duplicate template');
    }
  };

  const openABTest = (template: TemplateWithStats) => {
    setSelectedTemplate(template);
    setAbTestForm({
      variant_name: 'B',
      subject_line: template.subject_line,
      body_html: template.body_html,
      body_plain: template.body_plain,
      weight: 50,
    });
    setIsABTestOpen(true);
  };

  const handleCreateVariant = async () => {
    if (!selectedTemplate) return;
    try {
      await createVariant.mutateAsync({
        template_id: selectedTemplate.id,
        variant_name: abTestForm.variant_name,
        subject_line: abTestForm.subject_line,
        body_html: abTestForm.body_html,
        body_plain: abTestForm.body_plain,
        weight: abTestForm.weight,
        is_active: true,
      });
      toast.success('A/B test variant created');
      setIsABTestOpen(false);
    } catch (error) {
      toast.error('Failed to create variant');
    }
  };

  const insertVariable = (variable: string) => {
    const tag = `{{${variable}}}`;
    setEditForm(prev => ({
      ...prev,
      body_html: prev.body_html + tag,
      body_plain: prev.body_plain + tag,
      variables: prev.variables.includes(variable) ? prev.variables : [...prev.variables, variable],
    }));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📧 Email Templates</h1>
          <p className="text-muted-foreground">Manage and optimize your email templates</p>
        </div>
        <Button onClick={() => openEditor()}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Template Performance (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{templates?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Active Templates</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">
                {templates?.reduce((sum, t) => sum + t.sent_count, 0) || 0}
              </div>
              <div className="text-sm text-muted-foreground">Total Sends</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">
                {templates && templates.length > 0
                  ? Math.round(templates.reduce((sum, t) => sum + t.open_rate, 0) / templates.length)
                  : 0}%
              </div>
              <div className="text-sm text-muted-foreground">Avg Open Rate</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">
                {templates && templates.length > 0
                  ? Math.round(templates.reduce((sum, t) => sum + t.reply_rate, 0) / templates.length)
                  : 0}%
              </div>
              <div className="text-sm text-muted-foreground">Avg Reply Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates by Category */}
      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Loading templates...
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {TEMPLATE_CATEGORIES.map(category => {
            const categoryTemplates = templatesByCategory[category.value] || [];
            const isExpanded = expandedCategories.includes(category.value);

            return (
              <Collapsible 
                key={category.value} 
                open={isExpanded}
                onOpenChange={() => toggleCategory(category.value)}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          {category.icon} {category.label}
                          <Badge variant="secondary">{categoryTemplates.length}</Badge>
                        </CardTitle>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      {categoryTemplates.length === 0 ? (
                        <p className="text-muted-foreground text-sm py-4">No templates in this category</p>
                      ) : (
                        <div className="space-y-3">
                          {categoryTemplates.map(template => (
                            <div 
                              key={template.id}
                              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{template.name}</span>
                                  {template.is_global && (
                                    <Badge variant="outline" className="text-xs">Global</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {template.sent_count} sent
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Eye className="h-3 w-3" />
                                    {Math.round(template.open_rate)}% open
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Reply className="h-3 w-3" />
                                    {Math.round(template.reply_rate)}% reply
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <span className={`font-bold ${getPerformanceColor(template.performance_score)}`}>
                                    {template.performance_score ? `${Math.round(template.performance_score)}/100` : 'N/A'}
                                  </span>
                                  {template.performance_score && template.performance_score >= 80 && (
                                    <TrendingUp className="h-4 w-4 text-green-500 inline ml-1" />
                                  )}
                                  {template.performance_score && template.performance_score < 60 && (
                                    <TrendingDown className="h-4 w-4 text-red-500 inline ml-1" />
                                  )}
                                </div>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="ghost" onClick={() => openEditor(template)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleDuplicate(template)}>
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => openABTest(template)}>
                                    <FlaskConical className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Template Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isNewTemplate ? '✏️ New Template' : `✏️ Edit: ${selectedTemplate?.name}`}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="edit" className="w-full">
            <TabsList>
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview" onClick={() => setPreviewMode(true)}>Preview</TabsTrigger>
              <TabsTrigger value="variables">Variables</TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Template Name</Label>
                  <Input
                    value={editForm.name}
                    onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Problem-Solution"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select
                    value={editForm.category}
                    onValueChange={(value: EmailTemplate['category']) => 
                      setEditForm(prev => ({ ...prev, category: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.icon} {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Subject Line</Label>
                <Input
                  value={editForm.subject_line}
                  onChange={e => setEditForm(prev => ({ ...prev, subject_line: e.target.value }))}
                  placeholder="e.g., Noticed {{company}} might be missing calls?"
                />
              </div>

              <div>
                <Label>Email Body (HTML)</Label>
                <Textarea
                  value={editForm.body_html}
                  onChange={e => setEditForm(prev => ({ ...prev, body_html: e.target.value }))}
                  placeholder="<p>Hi {{first_name}},</p>..."
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>

              <div>
                <Label>Plain Text Version</Label>
                <Textarea
                  value={editForm.body_plain}
                  onChange={e => setEditForm(prev => ({ ...prev, body_plain: e.target.value }))}
                  placeholder="Hi {{first_name}},"
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="text-sm text-muted-foreground mb-2">Subject:</div>
                <div className="font-medium mb-4">
                  {personalizeTemplate(editForm.subject_line, sampleData)}
                </div>
                <div className="text-sm text-muted-foreground mb-2">Body:</div>
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: personalizeTemplate(editForm.body_html, sampleData) 
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                * Preview uses sample data. Actual emails will be personalized with real lead data.
              </p>
            </TabsContent>

            <TabsContent value="variables" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Click a variable to insert it into the template body.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATE_VARIABLES.map(variable => (
                  <Button
                    key={variable.key}
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={() => insertVariable(variable.key)}
                  >
                    <code className="text-primary mr-2">{`{{${variable.key}}}`}</code>
                    <span className="text-muted-foreground text-xs">{variable.description}</span>
                  </Button>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate} disabled={createTemplate.isPending || updateTemplate.isPending}>
              {createTemplate.isPending || updateTemplate.isPending ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* A/B Test Dialog */}
      <Dialog open={isABTestOpen} onOpenChange={setIsABTestOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>🧪 A/B Test: {selectedTemplate?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Variant A (Current)</span>
                <Badge>50%</Badge>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Subject:</span> {selectedTemplate?.subject_line}
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium">Variant B (New)</span>
                <Badge variant="outline">{abTestForm.weight}%</Badge>
              </div>
              <div className="space-y-3">
                <div>
                  <Label>Subject Line</Label>
                  <Input
                    value={abTestForm.subject_line}
                    onChange={e => setAbTestForm(prev => ({ ...prev, subject_line: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Email Body</Label>
                  <Textarea
                    value={abTestForm.body_html}
                    onChange={e => setAbTestForm(prev => ({ ...prev, body_html: e.target.value }))}
                    rows={6}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>Test Weight (% to receive Variant B)</Label>
              <Input
                type="number"
                min="10"
                max="90"
                value={abTestForm.weight}
                onChange={e => setAbTestForm(prev => ({ ...prev, weight: parseInt(e.target.value) || 50 }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsABTestOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateVariant} disabled={createVariant.isPending}>
              {createVariant.isPending ? 'Creating...' : 'Start A/B Test'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
