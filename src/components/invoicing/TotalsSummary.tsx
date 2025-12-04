interface TotalsSummaryProps {
  subtotal: number;
  lineItemDiscounts?: number;
  overallDiscountType?: 'percentage' | 'fixed';
  overallDiscountAmount?: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  depositRequired?: boolean;
  depositAmount?: number;
  depositType?: 'fixed' | 'percentage';
  amountPaid?: number;
}

export const TotalsSummary = ({
  subtotal,
  lineItemDiscounts = 0,
  overallDiscountType,
  overallDiscountAmount = 0,
  taxRate,
  taxAmount,
  total,
  depositRequired,
  depositAmount,
  depositType,
  amountPaid,
}: TotalsSummaryProps) => {
  const calculateDeposit = () => {
    if (!depositRequired || !depositAmount) return 0;
    if (depositType === 'percentage') {
      return (total * depositAmount) / 100;
    }
    return depositAmount;
  };

  const calculateOverallDiscount = () => {
    if (!overallDiscountAmount || overallDiscountAmount <= 0) return 0;
    const subtotalAfterLineDiscounts = subtotal - lineItemDiscounts;
    if (overallDiscountType === 'percentage') {
      return subtotalAfterLineDiscounts * (overallDiscountAmount / 100);
    }
    return overallDiscountAmount;
  };

  const overallDiscount = calculateOverallDiscount();
  const balanceDue = amountPaid !== undefined ? total - amountPaid : total;

  const totalDiscount = lineItemDiscounts + overallDiscount;

  return (
    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
      <div className="flex justify-between text-sm">
        <span>Subtotal</span>
        <span>${subtotal.toFixed(2)}</span>
      </div>
      
      {totalDiscount > 0 && (
        <div className="flex justify-between text-sm text-orange-600">
          <span>Discount</span>
          <span>-${totalDiscount.toFixed(2)}</span>
        </div>
      )}
      
      {taxRate > 0 && (
        <div className="flex justify-between text-sm">
          <span>Tax ({taxRate}%)</span>
          <span>${taxAmount.toFixed(2)}</span>
        </div>
      )}
      
      <div className="border-t pt-2 flex justify-between font-semibold">
        <span>Total</span>
        <span>${total.toFixed(2)}</span>
      </div>
      
      {depositRequired && depositAmount && depositAmount > 0 && (
        <div className="flex justify-between text-sm text-primary">
          <span>Deposit Required</span>
          <span>
            ${calculateDeposit().toFixed(2)}
            {depositType === 'percentage' && ` (${depositAmount}%)`}
          </span>
        </div>
      )}
      
      {amountPaid !== undefined && amountPaid > 0 && (
        <>
          <div className="flex justify-between text-sm text-green-600">
            <span>Amount Paid</span>
            <span>-${amountPaid.toFixed(2)}</span>
          </div>
          <div className="border-t pt-2 flex justify-between font-semibold text-lg">
            <span>Balance Due</span>
            <span>${balanceDue.toFixed(2)}</span>
          </div>
        </>
      )}
    </div>
  );
};
