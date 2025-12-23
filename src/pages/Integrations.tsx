import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, ExternalLink, Check, Settings, Plug, Zap, MessageSquare, Mail, Calendar, CreditCard, FileText, Phone, BarChart3 } from 'lucide-react';
import { 
  useIntegrations, 
  useUserIntegrations, 
  useConnectIntegration, 
  useDisconnectIntegration,
  useUpdateIntegrationConfig,
  useIntegrationLogs,
  CATEGORY_CONFIG,
  type Integration,
  type UserIntegration
} from '@/hooks/useIntegrations';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  automation: <Zap className="h-4 w-4" />,
  communication: <MessageSquare className="h-4 w-4" />,
  productivity: <BarChart3 className="h-4 w-4" />,
  calendar: <Calendar className="h-4 w-4" />,
  crm: <Plug className="h-4 w-4" />,
  marketing: <Mail className="h-4 w-4" />,
  phone: <Phone className="h-4 w-4" />,
  documents: <FileText className="h-4 w-4" />,
  payment: <CreditCard className="h-4 w-4" />,
  accounting: <CreditCard className="h-4 w-4" />
};

export default function Integrations() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [configureIntegration, setConfigureIntegration] = useState<UserIntegration | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');

  const { data: integrations = [], isLoading } = useIntegrations(selectedCategory);
  const { data: userIntegrations = [] } = useUserIntegrations();
  const connectMutation = useConnectIntegration();
  const disconnectMutation = useDisconnectIntegration();
  const updateConfigMutation = useUpdateIntegrationConfig();

  const connectedIds = new Set(userIntegrations.map(ui => ui.integration_id));

  const filteredIntegrations = integrations.filter(i => 
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const connectedIntegrations = userIntegrations.filter(ui => ui.status === 'active');
  const categories = [...new Set(integrations.map(i => i.category))];

  const handleConnect = async (integration: Integration) => {
    if (integration.requires_api_key && !apiKey) {
      setSelectedIntegration(integration);
      return;
    }

    await connectMutation.mutateAsync({
      integrationId: integration.id,
      config: { webhook_url: webhookUrl },
      credentials: apiKey ? { api_key: apiKey } : {}
    });

    setSelectedIntegration(null);
    setApiKey('');
    setWebhookUrl('');
  };

  const handleDisconnect = async (userIntegration: UserIntegration) => {
    await disconnectMutation.mutateAsync(userIntegration.id);
  };

  const getUserIntegration = (integrationId: string) => 
    userIntegrations.find(ui => ui.integration_id === integrationId);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Integrations Marketplace</h1>
          <p className="text-muted-foreground">Connect your favorite tools to EverLaunch</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            {categories.slice(0, 4).map(cat => (
              <TabsTrigger key={cat} value={cat} className="capitalize">
                {CATEGORY_CONFIG[cat]?.label || cat}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Connected Integrations */}
      {connectedIntegrations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            Connected ({connectedIntegrations.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {connectedIntegrations.map(ui => (
              <Card key={ui.id} className="relative">
                <div className="absolute top-2 right-2">
                  <Badge variant="default" className="bg-green-500">Active</Badge>
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      {CATEGORY_ICONS[ui.integration?.category || 'automation']}
                    </div>
                    <CardTitle className="text-lg">{ui.integration?.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setConfigureIntegration(ui)}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Settings
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDisconnect(ui)}
                    >
                      Disconnect
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Available Integrations */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          {selectedCategory === 'all' ? 'All Integrations' : CATEGORY_CONFIG[selectedCategory]?.label || selectedCategory}
        </h2>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-1/2" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted rounded w-full mb-2" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIntegrations.map(integration => {
              const isConnected = connectedIds.has(integration.id);
              
              return (
                <Card key={integration.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                          {CATEGORY_ICONS[integration.category]}
                        </div>
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {integration.name}
                            {integration.is_beta && (
                              <Badge variant="secondary">Beta</Badge>
                            )}
                          </CardTitle>
                          <Badge variant="outline" className="capitalize mt-1">
                            {CATEGORY_CONFIG[integration.category]?.label || integration.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CardDescription className="line-clamp-2">
                      {integration.description}
                    </CardDescription>
                    
                    {integration.pricing_info && (
                      <p className="text-sm text-muted-foreground">
                        {integration.pricing_info.free_tier && `Free: ${integration.pricing_info.free_tier}`}
                        {integration.pricing_info.paid_from && ` • From ${integration.pricing_info.paid_from}`}
                      </p>
                    )}

                    <div className="flex gap-2">
                      {isConnected ? (
                        <Button variant="outline" size="sm" disabled>
                          <Check className="h-4 w-4 mr-1" />
                          Connected
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          onClick={() => handleConnect(integration)}
                          disabled={connectMutation.isPending}
                        >
                          <Plug className="h-4 w-4 mr-1" />
                          Connect
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedIntegration(integration)}
                      >
                        Learn More
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Integration Detail Modal */}
      <Dialog open={!!selectedIntegration} onOpenChange={() => setSelectedIntegration(null)}>
        <DialogContent className="max-w-lg">
          {selectedIntegration && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                    {CATEGORY_ICONS[selectedIntegration.category]}
                  </div>
                  <div>
                    <DialogTitle className="text-xl">{selectedIntegration.name}</DialogTitle>
                    <DialogDescription>{selectedIntegration.description}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-6 pr-4">
                  {/* Features */}
                  {selectedIntegration.features.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Features</h4>
                      <ul className="space-y-1">
                        {selectedIntegration.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Use Cases */}
                  {selectedIntegration.use_cases.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Use Cases</h4>
                      <ul className="space-y-1">
                        {selectedIntegration.use_cases.map((useCase, i) => (
                          <li key={i} className="text-sm text-muted-foreground">
                            • {useCase}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Pricing */}
                  {selectedIntegration.pricing_info && (
                    <div>
                      <h4 className="font-semibold mb-2">Pricing</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedIntegration.pricing_info.free_tier && (
                          <span>Free tier: {selectedIntegration.pricing_info.free_tier}</span>
                        )}
                        {selectedIntegration.pricing_info.paid_from && (
                          <span className="block">Paid plans from {selectedIntegration.pricing_info.paid_from}</span>
                        )}
                      </p>
                    </div>
                  )}

                  {/* API Key Input for integrations that require it */}
                  {selectedIntegration.requires_api_key && !connectedIds.has(selectedIntegration.id) && (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="space-y-2">
                        <Label>API Key</Label>
                        <Input
                          type="password"
                          placeholder="Enter your API key"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Your API key will be encrypted and stored securely.
                        </p>
                      </div>
                      
                      {selectedIntegration.slug === 'zapier' && (
                        <div className="space-y-2">
                          <Label>Webhook URL (optional)</Label>
                          <Input
                            placeholder="https://hooks.zapier.com/..."
                            value={webhookUrl}
                            onChange={(e) => setWebhookUrl(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="flex gap-2 pt-4">
                {!connectedIds.has(selectedIntegration.id) ? (
                  <Button 
                    onClick={() => handleConnect(selectedIntegration)}
                    disabled={connectMutation.isPending || (selectedIntegration.requires_api_key && !apiKey)}
                    className="flex-1"
                  >
                    <Plug className="h-4 w-4 mr-2" />
                    Connect to {selectedIntegration.name}
                  </Button>
                ) : (
                  <Button variant="outline" className="flex-1" disabled>
                    <Check className="h-4 w-4 mr-2" />
                    Already Connected
                  </Button>
                )}
                
                {selectedIntegration.documentation_url && (
                  <Button variant="outline" asChild>
                    <a href={selectedIntegration.documentation_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Configure Integration Modal */}
      <IntegrationConfigDialog
        userIntegration={configureIntegration}
        onClose={() => setConfigureIntegration(null)}
        onSave={(config) => {
          if (configureIntegration) {
            updateConfigMutation.mutate({ 
              userIntegrationId: configureIntegration.id, 
              config 
            });
          }
        }}
      />
    </div>
  );
}

function IntegrationConfigDialog({ 
  userIntegration, 
  onClose, 
  onSave 
}: { 
  userIntegration: UserIntegration | null;
  onClose: () => void;
  onSave: (config: Record<string, unknown>) => void;
}) {
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const { data: logs = [] } = useIntegrationLogs(userIntegration?.id);

  if (!userIntegration) return null;

  const integration = userIntegration.integration;
  const isSlack = integration?.slug === 'slack';
  const isZapier = integration?.slug === 'zapier';

  return (
    <Dialog open={!!userIntegration} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configure {integration?.name}</DialogTitle>
          <DialogDescription>Manage your integration settings</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="settings">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="logs">Activity Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-4 pt-4">
            {isSlack && (
              <>
                <div className="space-y-2">
                  <Label>Notification Channel</Label>
                  <Input 
                    placeholder="#sales"
                    defaultValue={(userIntegration.config as Record<string, string>).channel || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, channel: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-3">
                  <Label>Events to Notify</Label>
                  {['New lead created', 'Demo viewed', 'Deal closed', 'Task completed'].map(event => (
                    <div key={event} className="flex items-center justify-between">
                      <span className="text-sm">{event}</span>
                      <Switch 
                        defaultChecked={(userIntegration.config as Record<string, boolean>)[event.toLowerCase().replace(/ /g, '_')] !== false}
                        onCheckedChange={(checked) => setConfig(prev => ({ 
                          ...prev, 
                          [event.toLowerCase().replace(/ /g, '_')]: checked 
                        }))}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {isZapier && (
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <Input 
                  placeholder="https://hooks.zapier.com/..."
                  defaultValue={(userIntegration.config as Record<string, string>).webhook_url || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, webhook_url: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Get this URL from your Zapier trigger
                </p>
              </div>
            )}

            {!isSlack && !isZapier && (
              <p className="text-sm text-muted-foreground">
                No additional configuration needed for this integration.
              </p>
            )}

            <Button onClick={() => onSave(config)} className="w-full">
              Save Settings
            </Button>
          </TabsContent>

          <TabsContent value="logs" className="pt-4">
            <ScrollArea className="h-[300px]">
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No activity logs yet
                </p>
              ) : (
                <div className="space-y-2">
                  {logs.map(log => (
                    <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${
                        log.status === 'success' ? 'bg-green-500' : 
                        log.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium capitalize">{log.action_type}</p>
                        {log.error_message && (
                          <p className="text-xs text-red-500">{log.error_message}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                          {log.duration_ms && ` • ${log.duration_ms}ms`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
