import { Badge } from "@/components/ui/badge";
import type { SubscriptionFeatureRow } from "@/lib/subscription-utils";
import { getFeatureDisplayValue } from "@/lib/subscription-utils";

export function FeatureBadge({ feature }: { feature: SubscriptionFeatureRow }) {
  const displayValue = getFeatureDisplayValue(feature);

  if (feature.feature_type === "boolean") {
    return (
      <Badge variant={displayValue === "Yes" ? "default" : "outline"}>
        {displayValue}
      </Badge>
    );
  }

  if (feature.feature_type === "not_included") {
    return <Badge variant="outline">No</Badge>;
  }

  return (
    <Badge variant={feature.feature_type === "unlimited" ? "default" : "secondary"}>
      {displayValue}
    </Badge>
  );
}
