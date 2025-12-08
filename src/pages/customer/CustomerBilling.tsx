import { CreditCard, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CustomerBilling() {
  return (
    <div className="p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Billing & Usage</h1>
          <p className="text-muted-foreground">
            View your plan, usage, and billing history
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Current Plan
              </CardTitle>
              <CardDescription>
                Your subscription details and billing information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CreditCard className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">
                  Plan details will appear here.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Usage This Period
              </CardTitle>
              <CardDescription>
                Track your minutes usage and overage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">
                  Usage statistics will appear here.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
