import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import {
  BarChart3, FileText, Plus, Play, Download, Clock, Calendar,
  Users, Filter, Settings, Trash2, ChevronRight, FileSpreadsheet,
  PieChart, TrendingUp, Activity, Target, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useReports,
  useCreateReport,
  useDeleteReport,
  useRunReport,
  useReportData,
  REPORT_TEMPLATES,
  exportToCSV,
  type Report,
  type ReportConfiguration,
} from '@/hooks/useReports';
import type { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const DATA_SOURCES = [
  { value: 'leads', label: 'Leads', icon: Users },
  { value: 'deals', label: 'Deals', icon: Target },
  { value: 'activities', label: 'Activities', icon: Activity },
];

const LEAD_COLUMNS = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'company', label: 'Company' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'source', label: 'Source' },
  { key: 'pipeline_status', label: 'Status' },
  { key: 'industry', label: 'Industry' },
  { key: 'created_at', label: 'Created Date' },
];

const DEAL_COLUMNS = [
  { key: 'name', label: 'Deal Name' },
  { key: 'amount', label: 'Amount' },
  { key: 'stage', label: 'Stage' },
  { key: 'probability', label: 'Probability' },
  { key: 'expected_close_date', label: 'Expected Close' },
  { key: 'created_at', label: 'Created Date' },
];

const ACTIVITY_COLUMNS = [
  { key: 'type', label: 'Type' },
  { key: 'subject', label: 'Subject' },
  { key: 'description', label: 'Description' },
  { key: 'related_to_name', label: 'Related To' },
  { key: 'created_at', label: 'Date' },
];

export default function Reports() {
  const { data: reports = [], isLoading } = useReports();
  const createReport = useCreateReport();
  const deleteReport = useDeleteReport();
  const runReport = useRunReport();

  const [activeTab, setActiveTab] = useState('my-reports');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [previewConfig, setPreviewConfig] = useState<ReportConfiguration | null>(null);

  // Report builder state
  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [dataSource, setDataSource] = useState<'leads' | 'deals' | 'activities'>('leads');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data: previewData } = useReportData(previewConfig);

  const scheduledReports = reports.filter(r => r.is_scheduled);
  const myReports = reports.filter(r => !r.is_global);
  const sharedReports = reports.filter(r => r.is_global);

  const getColumnsForSource = () => {
    switch (dataSource) {
      case 'leads': return LEAD_COLUMNS;
      case 'deals': return DEAL_COLUMNS;
      case 'activities': return ACTIVITY_COLUMNS;
      default: return [];
    }
  };

  const handleCreateReport = async () => {
    if (!reportName.trim()) {
      toast.error('Report name is required');
      return;
    }

    try {
      await createReport.mutateAsync({
        name: reportName,
        description: reportDescription,
        report_type: 'custom',
        configuration: {
          dataSource,
          filters: [],
          columns: selectedColumns,
          groupBy: groupBy || undefined,
          sortBy,
          sortOrder,
        },
      });
      toast.success('Report created');
      setShowCreateDialog(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to create report');
    }
  };

  const handleCreateFromTemplate = async (template: typeof REPORT_TEMPLATES[0]) => {
    try {
      await createReport.mutateAsync({
        name: template.name,
        description: template.description,
        report_type: template.report_type,
        configuration: template.configuration,
      });
      toast.success('Report created from template');
      setShowTemplateDialog(false);
    } catch (error) {
      toast.error('Failed to create report');
    }
  };

  const handleRunReport = async (report: Report) => {
    try {
      await runReport.mutateAsync(report.id);
      toast.success('Report executed successfully');
    } catch (error) {
      toast.error('Failed to run report');
    }
  };

  const handlePreview = (report: Report) => {
    setSelectedReport(report);
    const config = report.configuration as unknown as ReportConfiguration;
    setPreviewConfig(config);
    setShowPreviewDialog(true);
  };

  const handleExport = () => {
    if (previewData?.data && selectedReport) {
      exportToCSV(previewData.data, selectedReport.name);
      toast.success('Report exported');
    }
  };

  const resetForm = () => {
    setReportName('');
    setReportDescription('');
    setDataSource('leads');
    setSelectedColumns([]);
    setGroupBy('');
    setSortBy('created_at');
    setSortOrder('desc');
  };

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'pipeline': return <Layers className="h-4 w-4" />;
      case 'performance': return <TrendingUp className="h-4 w-4" />;
      case 'activity': return <Activity className="h-4 w-4" />;
      case 'forecast': return <Target className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Build custom reports and analyze your data</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Layers className="h-4 w-4 mr-2" />
                From Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create from Template</DialogTitle>
                <DialogDescription>Choose a pre-built report template</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-4">
                {REPORT_TEMPLATES.map((template) => (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => handleCreateFromTemplate(template)}
                  >
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="p-2 rounded-md bg-primary/10">
                        {getReportTypeIcon(template.report_type)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{template.name}</h4>
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Build Custom Report</DialogTitle>
                <DialogDescription>Configure your report settings</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Report Name</Label>
                  <Input
                    placeholder="Enter report name"
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea
                    placeholder="What does this report show?"
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data Source</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {DATA_SOURCES.map((source) => (
                      <Button
                        key={source.value}
                        variant={dataSource === source.value ? 'default' : 'outline'}
                        className="justify-start"
                        onClick={() => {
                          setDataSource(source.value as typeof dataSource);
                          setSelectedColumns([]);
                        }}
                      >
                        <source.icon className="h-4 w-4 mr-2" />
                        {source.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Columns to Include</Label>
                  <div className="grid grid-cols-2 gap-2 p-3 border rounded-md max-h-40 overflow-y-auto">
                    {getColumnsForSource().map((col) => (
                      <div key={col.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={col.key}
                          checked={selectedColumns.includes(col.key)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedColumns([...selectedColumns, col.key]);
                            } else {
                              setSelectedColumns(selectedColumns.filter(c => c !== col.key));
                            }
                          }}
                        />
                        <label htmlFor={col.key} className="text-sm cursor-pointer">
                          {col.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Group By (optional)</Label>
                    <Select value={groupBy} onValueChange={setGroupBy}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {getColumnsForSource().map((col) => (
                          <SelectItem key={col.key} value={col.key}>{col.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Sort By</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getColumnsForSource().map((col) => (
                          <SelectItem key={col.key} value={col.key}>{col.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'asc' | 'desc')}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateReport} disabled={createReport.isPending}>
                  Create Report
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{reports.length}</p>
                <p className="text-sm text-muted-foreground">Total Reports</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-blue-500/10">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{scheduledReports.length}</p>
                <p className="text-sm text-muted-foreground">Scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-green-500/10">
                <Play className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {reports.filter(r => r.last_run_at).length}
                </p>
                <p className="text-sm text-muted-foreground">Run This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-purple-500/10">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{sharedReports.length}</p>
                <p className="text-sm text-muted-foreground">Shared</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="my-reports">My Reports</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="shared">Shared</TabsTrigger>
        </TabsList>

        <TabsContent value="my-reports" className="mt-4">
          <ReportsList
            reports={myReports}
            isLoading={isLoading}
            onRun={handleRunReport}
            onPreview={handlePreview}
            onDelete={(id) => deleteReport.mutate(id)}
          />
        </TabsContent>

        <TabsContent value="scheduled" className="mt-4">
          <ReportsList
            reports={scheduledReports}
            isLoading={isLoading}
            onRun={handleRunReport}
            onPreview={handlePreview}
            onDelete={(id) => deleteReport.mutate(id)}
            showSchedule
          />
        </TabsContent>

        <TabsContent value="shared" className="mt-4">
          <ReportsList
            reports={sharedReports}
            isLoading={isLoading}
            onRun={handleRunReport}
            onPreview={handlePreview}
            onDelete={(id) => deleteReport.mutate(id)}
          />
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {selectedReport?.name}
            </DialogTitle>
            <DialogDescription>
              Generated: {new Date().toLocaleString()} • {previewData?.data?.length || 0} records
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Summary */}
            {previewData?.summary && (
              <div className="grid grid-cols-4 gap-3 mb-4">
                <Card>
                  <CardContent className="pt-3">
                    <p className="text-2xl font-bold">{previewData.summary.total as number || 0}</p>
                    <p className="text-xs text-muted-foreground">Total Records</p>
                  </CardContent>
                </Card>
                {previewData.summary.totalRevenue !== undefined && (
                  <Card>
                    <CardContent className="pt-3">
                      <p className="text-2xl font-bold">
                        ${(previewData.summary.totalRevenue as number).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Total Revenue</p>
                    </CardContent>
                  </Card>
                )}
                {previewData.summary.avgDealSize !== undefined && (
                  <Card>
                    <CardContent className="pt-3">
                      <p className="text-2xl font-bold">
                        ${Math.round(previewData.summary.avgDealSize as number).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Avg Deal Size</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Data Table */}
            <ScrollArea className="flex-1 border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    {previewConfig?.columns?.map((col) => (
                      <TableHead key={col}>{col.replace(/_/g, ' ')}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData?.data?.slice(0, 50).map((row, i) => (
                    <TableRow key={i}>
                      {previewConfig?.columns?.map((col) => (
                        <TableCell key={col} className="text-sm">
                          {formatValue(row[col])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Close
            </Button>
            <Button onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ReportsListProps {
  reports: Report[];
  isLoading: boolean;
  onRun: (report: Report) => void;
  onPreview: (report: Report) => void;
  onDelete: (id: string) => void;
  showSchedule?: boolean;
}

function ReportsList({ reports, isLoading, onRun, onPreview, onDelete, showSchedule }: ReportsListProps) {
  if (isLoading) {
    return <p className="text-muted-foreground text-center py-8">Loading reports...</p>;
  }

  if (reports.length === 0) {
    return (
      <Card className="py-12">
        <div className="text-center">
          <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No reports yet</p>
          <p className="text-sm text-muted-foreground">Create your first report to get started</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => (
        <Card key={report.id}>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-md bg-muted">
                {getReportIcon(report.report_type)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium">{report.name}</h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="secondary" className="text-xs">
                    {report.report_type}
                  </Badge>
                  {report.last_run_at && (
                    <span>
                      Last run: {formatDistanceToNow(new Date(report.last_run_at), { addSuffix: true })}
                    </span>
                  )}
                  {showSchedule && report.schedule_frequency && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {report.schedule_frequency}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => onRun(report)}>
                  <Play className="h-3.5 w-3.5 mr-1" />
                  Run
                </Button>
                <Button variant="outline" size="sm" onClick={() => onPreview(report)}>
                  <BarChart3 className="h-3.5 w-3.5 mr-1" />
                  Preview
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onDelete(report.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function getReportIcon(type: string) {
  switch (type) {
    case 'pipeline': return <Layers className="h-4 w-4" />;
    case 'performance': return <TrendingUp className="h-4 w-4" />;
    case 'activity': return <Activity className="h-4 w-4" />;
    case 'forecast': return <Target className="h-4 w-4" />;
    default: return <FileText className="h-4 w-4" />;
  }
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
    return format(new Date(value), 'MMM d, yyyy');
  }
  return String(value);
}
