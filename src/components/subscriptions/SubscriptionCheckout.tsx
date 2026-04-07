import { CreditCard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SubscriptionPackageWithFeatures } from "@/lib/subscription-utils";
import { formatCurrencyLabel, formatDurationLabel, getEffectivePrice } from "@/lib/subscription-utils";

export function SubscriptionCheckout({
  pkg,
  submitting,
  onSubmit,
}: {
  pkg: SubscriptionPackageWithFeatures;
  submitting?: boolean;
  onSubmit: () => Promise<void>;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
      <Card>
        <CardHeader>
          <CardTitle>সাবস্ক্রিপশন চেকআউট</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <p className="text-sm font-semibold text-primary">ডাইরেক্ট bKash চেকআউট</p>
            <p className="mt-2 text-sm text-muted-foreground">
              কোনো payment gateway select করতে হবে না। Confirm করলেই সরাসরি bKash payment page open হবে।
            </p>
          </div>

          <Button className="w-full gap-2" onClick={() => void onSubmit()} disabled={submitting}>
            <CreditCard className="h-4 w-4" />
            {submitting ? "bKash-এ পাঠানো হচ্ছে..." : "bKash-এ পেমেন্ট করুন"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>অর্ডার সারাংশ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-lg font-bold">{pkg.name}</p>
            <p className="text-sm text-muted-foreground">{pkg.short_description}</p>
          </div>
          <div className="rounded-xl border bg-muted/40 p-4">
            <div className="flex items-center justify-between text-sm">
              <span>মূল্য</span>
              <span className="font-semibold">{formatCurrencyLabel(getEffectivePrice(pkg), pkg.currency)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span>মেয়াদ</span>
              <span className="font-semibold">{formatDurationLabel(pkg)}</span>
            </div>
          </div>
          <div className="rounded-xl border bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
            <div className="flex items-center gap-2 font-medium">
              <ShieldCheck className="h-4 w-4" /> Payment success হলে package টি আপনার profile-এ automatically activate হবে
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
