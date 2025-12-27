import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, DollarSign, Calendar, Clock, History } from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useBillingConfigurations,
  useBillingConfigurationChanges,
  useUpdateActiveBillingConfiguration,
  BillingConfiguration,
} from '@/hooks/useBillingConfiguration';

export default function BillingSettings() {
  const { data: configurations, isLoading: configsLoading } = useBillingConfigurations();
  const { data: changes, isLoading: changesLoading } = useBillingConfigurationChanges();
  const updateMutation = useUpdateActiveBillingConfiguration();
  
  const [selectedConfig, setSelectedConfig] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const activeConfig = configurations?.find(c => c.is_active);

  const handleSave = () => {
    if (!selectedConfig || selectedConfig === activeConfig?.name) return;
    setShowConfirmDialog(true);
  };

  const confirmChange = () => {
    if (!selectedConfig) return;
    updateMutation.mutate({
      newConfigName: selectedConfig,
      oldConfigName: activeConfig?.name || null,
    });
    setShowConfirmDialog(false);
    setSelectedConfig(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (configsLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing Model Configuration</h1>
        <p className="text-muted-foreground mt-1">
          Configure how new customer signups are billed
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Active Billing Model</CardTitle>
          <CardDescription>
            Choose the billing model that will be used for all new customer signups
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            value={selectedConfig || activeConfig?.name}
            onValueChange={setSelectedConfig}
            className="space-y-4"
          >
            {configurations?.map((config) => (
              <BillingConfigCard
                key={config.id}
                config={config}
                isSelected={(selectedConfig || activeConfig?.name) === config.name}
                formatCurrency={formatCurrency}
              />
            ))}
          </RadioGroup>

          <div className="flex items-center gap-4 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={!selectedConfig || selectedConfig === activeConfig?.name || updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
            {selectedConfig && selectedConfig !== activeConfig?.name && (
              <Button variant="outline" onClick={() => setSelectedConfig(null)}>
                Cancel
              </Button>
            )}
          </div>

          <div className="flex items-start gap-2 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-500">Important Notice</p>
              <p className="text-muted-foreground">
                Changing the billing model only affects <strong>new signups</strong>. 
                Existing customers will keep their current billing arrangement.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Billing Model Change History
          </CardTitle>
          <CardDescription>
            Record of all billing model changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {changesLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : changes && changes.length > 0 ? (
            <div className="space-y-3">
              {changes.map((change) => (
                <div
                  key={change.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm">
                        Changed from{' '}
                        <span className="font-medium">
                          {change.old_configuration_name || 'None'}
                        </span>{' '}
                        to{' '}
                        <span className="font-medium text-primary">
                          {change.new_configuration_name}
                        </span>
                      </p>
                      {change.note && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Note: {change.note}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(change.changed_at), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No changes recorded yet
            </p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Billing Model?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change the active billing model from{' '}
              <strong>{activeConfig?.display_name}</strong> to{' '}
              <strong>
                {configurations?.find(c => c.name === selectedConfig)?.display_name}
              </strong>
              ?
              <br /><br />
              This will affect all new customer signups immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmChange}>
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BillingConfigCard({
  config,
  isSelected,
  formatCurrency,
}: {
  config: BillingConfiguration;
  isSelected: boolean;
  formatCurrency: (amount: number) => string;
}) {
  return (
    <div
      className={`relative flex items-start gap-4 p-4 border rounded-lg transition-colors ${
        isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/50'
      }`}
    >
      <RadioGroupItem value={config.name} id={config.name} className="mt-1" />
      <Label htmlFor={config.name} className="flex-1 cursor-pointer">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold text-lg">{config.display_name}</span>
          {config.is_active && (
            <Badge variant="default" className="text-xs">
              ACTIVE
            </Badge>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Setup fee:</span>
            <span className="font-medium">{formatCurrency(config.setup_fee)}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">First month:</span>
            <span className="font-medium">
              {config.charge_first_month ? 'Charged at signup' : 'Included (no charge)'}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Billing starts:</span>
            <span className="font-medium">
              {config.billing_delay_days === 0 
                ? 'Immediately' 
                : `Day ${config.billing_delay_days}`}
            </span>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground">{config.description}</p>
      </Label>
    </div>
  );
}
