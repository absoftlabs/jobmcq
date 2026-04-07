import { Check, CircleX, Minus } from "lucide-react";
import type { SubscriptionFeatureRow } from "@/lib/subscription-utils";
import { FeatureBadge } from "@/components/subscriptions/FeatureBadge";

export function FeatureList({ features }: { features: SubscriptionFeatureRow[] }) {
  return (
    <div className="space-y-2">
      {features.map((feature) => {
        const icon =
          feature.icon_type === "cross" || feature.feature_type === "not_included" ? (
            <CircleX className="h-4 w-4 text-rose-500" />
          ) : feature.icon_type === "badge" ? (
            <Minus className="h-4 w-4 text-amber-500" />
          ) : (
            <Check className="h-4 w-4 text-emerald-500" />
          );

        return (
          <div
            key={feature.id}
            className="flex items-center justify-between gap-3 border-b border-dashed border-border/80 py-2 last:border-b-0"
          >
            <div className="flex min-w-0 items-center gap-2">
              {icon}
              <span className={feature.is_highlighted ? "font-medium text-foreground" : "text-muted-foreground"}>
                {feature.feature_label}
              </span>
            </div>
            <FeatureBadge feature={feature} />
          </div>
        );
      })}
    </div>
  );
}
