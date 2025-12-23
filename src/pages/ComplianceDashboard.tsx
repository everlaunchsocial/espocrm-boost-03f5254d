import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Shield, FileText, Clock, CheckCircle, AlertTriangle, Download, Trash2, 
  Edit, Ban, RefreshCw, Eye, Settings, History, Database
} from 'lucide-react';
import { 
  useDataRequests, 
  useConsentRecords, 
  useDataRetentionPolicies, 
  useComplianceAuditLog,
  usePrivacySettings,
  useUpdateDataRequest,
  useUpdateRetentionPolicy,
  useUpdatePrivacySettings,
  REQUEST_STATUS_COLORS,
  EVENT_TYPE_ICONS,
  CONSENT_TYPES,
  DataRequest,
  DataRetentionPolicy
} from '@/hooks/useCompliance';
import { format, formatDistanceToNow, addDays } from 'date-fns';

export default function ComplianceDashboard() {
  const [activeTab, setActiveTab] = useState('requests');
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DataRequest | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  const { data: requests = [], isLoading: requestsLoading } = useDataRequests();
  const { data: consents = [] } = useConsentRecords();
  const { data: policies = [] } = useDataRetentionPolicies();
  const { data: auditLogs = [] } = useComplianceAuditLog({ days: 30 });
  const { data: privacySettings } = usePrivacySettings();
  
  const updateRequest = useUpdateDataRequest();
  const updatePolicy = useUpdateRetentionPolicy();
  const updateSettings = useUpdatePrivacySettings();

  const pendingRequests = requests.filter(r => r.status === 'pending' || r.status === 'processing');
  const completedRequests = requests.filter(r => r.status === 'completed');

  const handleProcessRequest = (request: DataRequest) => {
    setSelectedRequest(request);
    setDeleteConfirmation('');
    setProcessDialogOpen(true);
  };

  const handleCompleteRequest = async () => {
    if (!selectedRequest) return;
    
    if (selectedRequest.request_type === 'deletion' && deleteConfirmation !== 'DELETE') {
      return;
    }

    await updateRequest.mutateAsync({
      id: selectedRequest.id,
      updates: {
        status: 'completed',
        completed_at: new Date().toISOString(),
      },
    });
    
    setProcessDialogOpen(false);
    setSelectedRequest(null);
  };

  const handleRejectRequest = async (id: string, reason: string) => {
    await updateRequest.mutateAsync({
      id,
      updates: {
        status: 'rejected',
        rejection_reason: reason,
        completed_at: new Date().toISOString(),
      },
    });
  };

  const handleTogglePolicy = async (policy: DataRetentionPolicy) => {
    await updatePolicy.mutateAsync({
      id: policy.id,
      updates: { auto_delete: !policy.auto_delete },
    });
  };

  const getRequestIcon = (type: string) => {
    switch (type) {
      case 'export': return <Download className="h-4 w-4" />;
      case 'deletion': return <Trash2 className="h-4 w-4" />;
      case 'correction': return <Edit className="h-4 w-4" />;
      case 'opt_out': return <Ban className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getDueDate = (createdAt: string) => {
    const dueDate = addDays(new Date(createdAt), 30);
    const daysLeft = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return { dueDate, daysLeft };
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Compliance & Privacy
          </h1>
          <p className="text-muted-foreground">GDPR/CCPA compliance management</p>
        </div>
        <Button variant="outline" onClick={() => setSettingsDialogOpen(true)}>
          <Settings className="h-4 w-4 mr-2" />
          Privacy Settings
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests.length}</div>
            {pendingRequests.filter(r => getDueDate(r.created_at).daysLeft <= 7).length > 0 && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                <AlertTriangle className="h-3 w-3" />
                {pendingRequests.filter(r => getDueDate(r.created_at).daysLeft <= 7).length} due soon
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedRequests.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Consents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{consents.filter(c => c.consent_given).length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Audit Events (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditLogs.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Requests
          </TabsTrigger>
          <TabsTrigger value="consents" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Consents
          </TabsTrigger>
          <TabsTrigger value="retention" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Retention
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Audit Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Requests</CardTitle>
              <CardDescription>Manage GDPR/CCPA data subject requests</CardDescription>
            </CardHeader>
            <CardContent>
              {requestsLoading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : requests.length === 0 ? (
                <p className="text-muted-foreground">No data requests yet.</p>
              ) : (
                <div className="space-y-4">
                  {requests.map((request) => {
                    const { dueDate, daysLeft } = getDueDate(request.created_at);
                    return (
                      <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                            {getRequestIcon(request.request_type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium capitalize">{request.request_type.replace('_', ' ')} Request</span>
                              <Badge className={REQUEST_STATUS_COLORS[request.status]}>
                                {request.status}
                              </Badge>
                              {!request.verified && request.status === 'pending' && (
                                <Badge variant="outline">Unverified</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{request.email}</p>
                            <p className="text-xs text-muted-foreground">
                              Requested: {format(new Date(request.created_at), 'MMM d, yyyy')} • Due: {format(dueDate, 'MMM d, yyyy')}
                              {request.status === 'pending' && daysLeft <= 7 && (
                                <span className="text-destructive ml-2">({daysLeft} days left)</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {request.status === 'pending' && request.verified && (
                            <>
                              <Button size="sm" onClick={() => handleProcessRequest(request)}>
                                Process
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleRejectRequest(request.id, 'Request rejected by administrator')}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {request.status === 'pending' && !request.verified && (
                            <Button size="sm" variant="outline">
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Resend Verification
                            </Button>
                          )}
                          {request.status === 'completed' && request.request_type === 'export' && request.export_file_url && (
                            <Button size="sm" variant="outline">
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          )}
                          <Button size="sm" variant="ghost">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consents" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Consent Records</CardTitle>
              <CardDescription>Track user consent for data processing</CardDescription>
            </CardHeader>
            <CardContent>
              {consents.length === 0 ? (
                <p className="text-muted-foreground">No consent records yet.</p>
              ) : (
                <div className="space-y-4">
                  {consents.map((consent) => (
                    <div key={consent.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${consent.consent_given ? 'bg-green-100' : 'bg-red-100'}`}>
                          {consent.consent_given ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <Ban className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {CONSENT_TYPES.find(t => t.value === consent.consent_type)?.label || consent.consent_type}
                            </span>
                            <Badge variant={consent.consent_given ? 'default' : 'secondary'}>
                              {consent.consent_given ? 'Active' : 'Revoked'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{consent.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {consent.consent_given ? 'Granted' : 'Revoked'}: {format(new Date(consent.consent_given ? consent.granted_at! : consent.revoked_at!), 'MMM d, yyyy')}
                            {' • '}{consent.consent_method}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retention" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Retention Policies</CardTitle>
              <CardDescription>Configure how long data is retained</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {policies.map((policy) => (
                  <div key={policy.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <Database className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="font-medium capitalize">{policy.data_type}</span>
                        <p className="text-sm text-muted-foreground">
                          Retention: {policy.retention_days} days
                          {policy.applies_to_status && ` • Applies to: ${policy.applies_to_status.join(', ')}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Action: {policy.anonymize_instead ? 'Anonymize' : 'Delete'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`auto-${policy.id}`} className="text-sm">Auto-process</Label>
                        <Switch
                          id={`auto-${policy.id}`}
                          checked={policy.auto_delete}
                          onCheckedChange={() => handleTogglePolicy(policy)}
                        />
                      </div>
                      <Button size="sm" variant="ghost">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Compliance Audit Log</CardTitle>
                  <CardDescription>Track all compliance-related events</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <p className="text-muted-foreground">No audit events yet.</p>
              ) : (
                <div className="space-y-4">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className="text-2xl">{EVENT_TYPE_ICONS[log.event_type] || '📋'}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">{log.event_type.replace(/_/g, ' ')}</span>
                          {log.legal_basis && (
                            <Badge variant="outline">{log.legal_basis}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </p>
                        {log.details && Object.keys(log.details).length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {JSON.stringify(log.details)}
                          </p>
                        )}
                        {log.ip_address && (
                          <p className="text-xs text-muted-foreground">IP: {log.ip_address}</p>
                        )}
                      </div>
                      <Button size="sm" variant="ghost">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Process Request Dialog */}
      <Dialog open={processDialogOpen} onOpenChange={setProcessDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedRequest && getRequestIcon(selectedRequest.request_type)}
              Process {selectedRequest?.request_type.replace('_', ' ')} Request
            </DialogTitle>
            <DialogDescription>
              Review and process this data request
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p><strong>Email:</strong> {selectedRequest.email}</p>
                <p><strong>Verified:</strong> {selectedRequest.verified ? 'Yes' : 'No'}</p>
                <p><strong>Requested:</strong> {format(new Date(selectedRequest.created_at), 'PPP')}</p>
                <p><strong>Due:</strong> {format(addDays(new Date(selectedRequest.created_at), 30), 'PPP')}</p>
              </div>

              {selectedRequest.request_type === 'deletion' && (
                <div className="p-4 border border-destructive/50 bg-destructive/10 rounded-lg space-y-3">
                  <p className="text-sm text-destructive font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Warning: This action is irreversible!
                  </p>
                  <p className="text-sm">Type "DELETE" to confirm permanent deletion:</p>
                  <Input
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="DELETE"
                  />
                </div>
              )}

              {selectedRequest.request_type === 'export' && (
                <div className="space-y-3">
                  <Label>Export Format</Label>
                  <Select defaultValue="json">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON (machine-readable)</SelectItem>
                      <SelectItem value="csv">CSV (spreadsheet)</SelectItem>
                      <SelectItem value="pdf">PDF (human-readable)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setProcessDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCompleteRequest}
              disabled={selectedRequest?.request_type === 'deletion' && deleteConfirmation !== 'DELETE'}
              variant={selectedRequest?.request_type === 'deletion' ? 'destructive' : 'default'}
            >
              {selectedRequest?.request_type === 'deletion' ? 'Permanently Delete' : 'Complete Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Privacy Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Privacy & Compliance Settings</DialogTitle>
            <DialogDescription>
              Configure GDPR/CCPA compliance settings
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-medium">Regulations</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>GDPR Compliance (EU)</Label>
                    <p className="text-sm text-muted-foreground">Enable for European users</p>
                  </div>
                  <Switch 
                    checked={privacySettings?.gdpr_enabled ?? true}
                    onCheckedChange={(checked) => updateSettings.mutate({ gdpr_enabled: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>CCPA Compliance (California)</Label>
                    <p className="text-sm text-muted-foreground">Enable for California users</p>
                  </div>
                  <Switch 
                    checked={privacySettings?.ccpa_enabled ?? true}
                    onCheckedChange={(checked) => updateSettings.mutate({ ccpa_enabled: checked })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">Consent Management</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Explicit Consent</Label>
                    <p className="text-sm text-muted-foreground">Require opt-in for marketing</p>
                  </div>
                  <Switch 
                    checked={privacySettings?.require_explicit_consent ?? true}
                    onCheckedChange={(checked) => updateSettings.mutate({ require_explicit_consent: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Cookie Consent Banner</Label>
                    <p className="text-sm text-muted-foreground">Show cookie banner to visitors</p>
                  </div>
                  <Switch 
                    checked={privacySettings?.cookie_banner_enabled ?? true}
                    onCheckedChange={(checked) => updateSettings.mutate({ cookie_banner_enabled: checked })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">Data Protection Officer</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>DPO Name</Label>
                  <Input 
                    placeholder="Jane Smith" 
                    defaultValue={privacySettings?.dpo_name ?? ''}
                    onBlur={(e) => updateSettings.mutate({ dpo_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>DPO Email</Label>
                  <Input 
                    placeholder="dpo@company.com" 
                    defaultValue={privacySettings?.dpo_email ?? ''}
                    onBlur={(e) => updateSettings.mutate({ dpo_email: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">Legal Documents</h3>
              <div className="space-y-2">
                <Label>Privacy Policy URL</Label>
                <Input 
                  placeholder="https://company.com/privacy" 
                  defaultValue={privacySettings?.privacy_policy_url ?? ''}
                  onBlur={(e) => updateSettings.mutate({ privacy_policy_url: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">Data Retention</h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Default Retention Period (days)</Label>
                  <Input 
                    type="number" 
                    placeholder="730" 
                    defaultValue={privacySettings?.data_retention_days ?? 730}
                    onBlur={(e) => updateSettings.mutate({ data_retention_days: parseInt(e.target.value) || 730 })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-delete Inactive Leads</Label>
                    <p className="text-sm text-muted-foreground">Automatically remove old inactive leads</p>
                  </div>
                  <Switch 
                    checked={privacySettings?.auto_delete_inactive_leads ?? false}
                    onCheckedChange={(checked) => updateSettings.mutate({ auto_delete_inactive_leads: checked })}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setSettingsDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
