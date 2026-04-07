import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SubscriptionPackageWithFeatures, UserSubscriptionRow } from "@/lib/subscription-utils";
import { formatDurationLabel, getDaysRemaining } from "@/lib/subscription-utils";

export function UserSubscriptionCard({
  subscription,
  pkg,
}: {
  subscription: UserSubscriptionRow | null | undefined;
  pkg?: SubscriptionPackageWithFeatures | null;
}) {
  const daysRemaining = subscription ? getDaysRemaining(subscription) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>বর্তমান প্ল্যান</CardTitle>
      </CardHeader>
      <CardContent>
        {!subscription ? (
          <p className="text-sm text-muted-foreground">এখনও কোনো সক্রিয় সাবস্ক্রিপশন নেই।</p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xl font-bold">{subscription.package_name}</p>
              <Badge variant={subscription.subscription_status === "active" || subscription.subscription_status === "lifetime" ? "default" : "outline"}>
                {subscription.subscription_status}
              </Badge>
            </div>
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground">শুরুর তারিখ</p>
                <p className="font-medium">{new Date(subscription.start_date).toLocaleDateString("en-US")}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground">মেয়াদ শেষ</p>
                <p className="font-medium">{subscription.end_date ? new Date(subscription.end_date).toLocaleDateString("en-US") : "আজীবন"}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground">বাকি দিন</p>
                <p className="font-medium">{daysRemaining === null ? "অসীম" : daysRemaining}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground">প্যাকেজের মেয়াদ</p>
                <p className="font-medium">{pkg ? formatDurationLabel(pkg) : subscription.is_lifetime ? "আজীবন" : "কাস্টম"}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
