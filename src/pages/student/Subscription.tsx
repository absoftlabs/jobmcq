import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserSubscriptionCard } from "@/components/subscriptions/UserSubscriptionCard";
import { useCurrentSubscription, useSubscriptionPackageById, useUserSubscriptionOrders, useUserSubscriptions } from "@/hooks/use-subscriptions";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrencyLabel } from "@/lib/subscription-utils";
import { Link } from "react-router-dom";

export default function StudentSubscriptionPage() {
  const { user } = useAuth();
  const subscriptionsQuery = useUserSubscriptions(user?.id);
  const ordersQuery = useUserSubscriptionOrders(user?.id);
  const currentSubscriptionQuery = useCurrentSubscription(user?.id);
  const currentPackageQuery = useSubscriptionPackageById(currentSubscriptionQuery.data?.package_id || undefined);

  const subscriptions = subscriptionsQuery.data || [];
  const orders = ordersQuery.data || [];

  const latestSubscription = useMemo(() => currentSubscriptionQuery.data || subscriptions[0] || null, [currentSubscriptionQuery.data, subscriptions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-primary/80">সাবস্ক্রিপশন সেন্টার</p>
          <h1 className="text-2xl font-black tracking-tight md:text-3xl">আমার সাবস্ক্রিপশন</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/pricing">প্ল্যান আপগ্রেড</Link></Button>
          <Button asChild><Link to="/pricing">রিনিউ / প্ল্যান পরিবর্তন</Link></Button>
        </div>
      </div>

      <UserSubscriptionCard subscription={latestSubscription} pkg={currentPackageQuery.data} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>সাবস্ক্রিপশন ইতিহাস</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>প্ল্যান</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead>শুরুর তারিখ</TableHead>
                  <TableHead>মেয়াদ শেষ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">এখনও কোনো সাবস্ক্রিপশন নেই।</TableCell>
                  </TableRow>
                ) : (
                  subscriptions.map((subscription) => (
                    <TableRow key={subscription.id}>
                      <TableCell>{subscription.package_name}</TableCell>
                      <TableCell>{subscription.subscription_status}</TableCell>
                      <TableCell>{new Date(subscription.start_date).toLocaleDateString("en-US")}</TableCell>
                      <TableCell>{subscription.end_date ? new Date(subscription.end_date).toLocaleDateString("en-US") : "আজীবন"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>অর্ডার ইতিহাস</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>পরিমাণ</TableHead>
                  <TableHead>মাধ্যম</TableHead>
                  <TableHead>পেমেন্ট</TableHead>
                  <TableHead>তারিখ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">এখনও কোনো অর্ডার নেই।</TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>{formatCurrencyLabel(order.amount, order.currency)}</TableCell>
                      <TableCell>{order.payment_method}</TableCell>
                      <TableCell>{order.payment_status}</TableCell>
                      <TableCell>{new Date(order.created_at).toLocaleDateString("en-US")}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
