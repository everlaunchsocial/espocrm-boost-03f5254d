import { DollarSign, Clock, TrendingUp } from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';
import { useActiveBillingConfiguration } from '@/hooks/useBillingConfiguration';

interface CommissionDisplayProps {
  /** Commission amount earned from setup fee (or setup + first month for immediate billing) */
  earnedAmount: number;
  /** Commission rate (1=30%, 2=15%, 3=5%) */
  commissionLevel: number;
  /** Customer's plan monthly price (e.g. 399) */
  planMonthlyPrice?: number;
  /** Customer's plan name (e.g. "Professional") */
  planName?: string;
  /** When the customer signed up / payment received */
  customerCreatedAt?: Date | null;
  /** Compact mode for dialog views */
  compact?: boolean;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getCommissionRate(level: number): number {
  switch (level) {
    case 1: return 0.30;
    case 2: return 0.15;
    case 3: return 0.05;
    default: return 0.30;
  }
}

function getCommissionRateLabel(level: number): string {
  switch (level) {
    case 1: return '30%';
    case 2: return '15%';
    case 3: return '5%';
    default: return `${level}%`;
  }
}

export function CommissionDisplay({
  earnedAmount,
  commissionLevel,
  planMonthlyPrice = 399,
  planName = 'Professional',
  customerCreatedAt,
  compact = false,
}: CommissionDisplayProps) {
  const { data: billingConfig, isLoading } = useActiveBillingConfiguration();
  
  const rate = getCommissionRate(commissionLevel);
  const rateLabel = getCommissionRateLabel(commissionLevel);
  
  // Calculate recurring commission based on plan price
  const recurringCommission = planMonthlyPrice * rate;
  
  // Determine billing start date based on active config
  const billingDelayDays = billingConfig?.billing_delay_days ?? 30;
  const setupFee = billingConfig?.setup_fee ?? 999;
  const chargeFirstMonth = billingConfig?.charge_first_month ?? false;
  
  // Calculate when billing starts
  const signupDate = customerCreatedAt || new Date();
  const billingStartDate = addDays(signupDate, billingDelayDays);
  const daysUntilBilling = differenceInDays(billingStartDate, new Date());
  const billingHasStarted = daysUntilBilling <= 0;
  
  // For earned commission display
  const setupFeeDescription = chargeFirstMonth 
    ? `${rateLabel} of $${setupFee} setup + $${planMonthlyPrice} first month`
    : `${rateLabel} of $${setupFee} setup fee`;

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-20 bg-muted rounded-lg" />
        <div className="h-20 bg-muted rounded-lg" />
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${compact ? '' : ''}`}>
      {/* Earned Commission (one-time) */}
      <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <label className="text-xs font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
            Earned Commission
          </label>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
            {formatCurrency(earnedAmount)}
          </span>
        </div>
        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
          {setupFeeDescription}
        </p>
      </div>

      {/* Recurring Revenue (monthly) */}
      <div className={`border rounded-lg p-4 ${
        billingHasStarted 
          ? 'bg-primary/5 border-primary/20' 
          : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
      }`}>
        <div className="flex items-center gap-2 mb-1">
          {billingHasStarted ? (
            <TrendingUp className="h-4 w-4 text-primary" />
          ) : (
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          )}
          <label className={`text-xs font-medium uppercase tracking-wide ${
            billingHasStarted 
              ? 'text-primary' 
              : 'text-amber-700 dark:text-amber-300'
          }`}>
            {billingHasStarted ? 'Recurring Revenue' : 'Pending Monthly Revenue'}
          </label>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-bold ${
            billingHasStarted ? 'text-primary' : 'text-amber-700 dark:text-amber-300'
          }`}>
            {formatCurrency(recurringCommission)}
          </span>
          <span className={`text-sm ${
            billingHasStarted ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-400'
          }`}>
            /month
          </span>
        </div>
        <p className={`text-xs mt-1 ${
          billingHasStarted 
            ? 'text-muted-foreground' 
            : 'text-amber-600 dark:text-amber-400'
        }`}>
          {rateLabel} of {planName} plan (${planMonthlyPrice}/month)
        </p>
        {!billingHasStarted && billingDelayDays > 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            Starts: {format(billingStartDate, 'MMM d, yyyy')} (in {daysUntilBilling} days)
            {!chargeFirstMonth && ' • First month included in setup fee'}
          </p>
        )}
        {billingHasStarted && (
          <p className="text-xs text-muted-foreground mt-1">
            Active since: {format(billingStartDate, 'MMM d, yyyy')}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Compact inline version for smaller spaces
 */
export function CommissionDisplayInline({
  earnedAmount,
  commissionLevel,
  planMonthlyPrice = 399,
}: {
  earnedAmount: number;
  commissionLevel: number;
  planMonthlyPrice?: number;
}) {
  const rate = getCommissionRate(commissionLevel);
  const rateLabel = getCommissionRateLabel(commissionLevel);
  const recurringCommission = planMonthlyPrice * rate;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Earned:</span>
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
          {formatCurrency(earnedAmount)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Monthly ({rateLabel}):</span>
        <span className="font-semibold text-primary">
          {formatCurrency(recurringCommission)}/mo
        </span>
      </div>
    </div>
  );
}
