import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FeatureList } from "@/components/subscriptions/FeatureList";
import {
  formatCurrencyLabel,
  formatDurationLabel,
  getEffectivePrice,
  type SubscriptionPackageWithFeatures,
} from "@/lib/subscription-utils";

export function PricingCard({
  pkg,
  currencySymbol = "BDT",
  showDiscountBadge = true,
  showPopularRibbon = true,
  onSubscribe,
}: {
  pkg: SubscriptionPackageWithFeatures;
  currencySymbol?: string;
  showDiscountBadge?: boolean;
  showPopularRibbon?: boolean;
  onSubscribe?: (pkg: SubscriptionPackageWithFeatures) => void;
}) {
  const currentPrice = getEffectivePrice(pkg);
  const hasDiscount = pkg.sale_price !== null && Number(pkg.sale_price) < Number(pkg.regular_price);

  return (
    <Card
      className={`relative flex h-full flex-col overflow-hidden border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
        pkg.is_highlighted ? "border-primary/50 shadow-lg shadow-primary/15" : "border-border/70"
      }`}
      style={{ borderTopColor: pkg.accent_color || undefined }}
    >
      {pkg.is_popular && showPopularRibbon ? (
        <div className="absolute right-4 top-4 rounded-full bg-red-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
          {pkg.badge_text || "সবচেয়ে জনপ্রিয়"}
        </div>
      ) : null}

      <CardHeader className="space-y-3">
        <div className="space-y-1">
          <CardTitle className="text-2xl font-black">{pkg.name}</CardTitle>
          <p className="text-sm text-muted-foreground">{pkg.short_description}</p>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-4xl font-black">{formatCurrencyLabel(currentPrice, currencySymbol)}</span>
              {hasDiscount ? (
                <span className="text-sm text-muted-foreground line-through">
                  {formatCurrencyLabel(pkg.regular_price, currencySymbol)}
                </span>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">{formatDurationLabel(pkg)}</p>
          </div>
          {hasDiscount && showDiscountBadge ? <Badge variant="secondary">অফার</Badge> : null}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        <FeatureList features={pkg.features} />
      </CardContent>

      <CardFooter>
        <Button
          className="w-full gap-2"
          style={{ backgroundColor: pkg.accent_color || undefined }}
          onClick={() => onSubscribe?.(pkg)}
        >
          {pkg.button_text || "সাবস্ক্রাইব করুন"} <ArrowRight className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
