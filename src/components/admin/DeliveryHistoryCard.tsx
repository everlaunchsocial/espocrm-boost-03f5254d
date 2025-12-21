import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { History, RefreshCw, CheckCircle, XCircle, Mail, Bell, Smartphone } from 'lucide-react';
import { useSummaryDeliveries } from '@/hooks/useSummaryDeliveries';
import { format } from 'date-fns';

interface DeliveryHistoryCardProps {
  userId?: string;
  showUserColumn?: boolean;
}

const methodIcons: Record<string, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  push: <Bell className="h-4 w-4" />,
  sms: <Smartphone className="h-4 w-4" />,
};

export function DeliveryHistoryCard({ userId, showUserColumn = false }: DeliveryHistoryCardProps) {
  const { deliveries, isLoading, retryDelivery, isRetrying } = useSummaryDeliveries(userId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Delivery History
        </CardTitle>
        <CardDescription>
          Recent voice summary delivery attempts
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : deliveries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No delivery history yet
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell className="font-medium">
                      {format(new Date(delivery.delivered_at), 'MMM d, yyyy h:mm a')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {methodIcons[delivery.delivery_method] || methodIcons.email}
                        <span className="capitalize">{delivery.delivery_method}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {delivery.status === 'success' ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Success
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                          <XCircle className="h-3 w-3 mr-1" />
                          Failed
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {delivery.status === 'failed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => retryDelivery(delivery.id)}
                          disabled={isRetrying}
                        >
                          <RefreshCw className={`h-4 w-4 mr-1 ${isRetrying ? 'animate-spin' : ''}`} />
                          Retry
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
