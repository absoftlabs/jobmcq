import { useMemo } from "react";
import { useCurrentSubscription, useSubscriptionPackageById } from "@/hooks/use-subscriptions";
import { buildFeatureAccessMap, isSubscriptionActive } from "@/lib/subscription-utils";

export const useSubscriptionAccess = (userId?: string) => {
  const currentSubscriptionQuery = useCurrentSubscription(userId);
  const packageId = currentSubscriptionQuery.data?.package_id;
  const hasActiveSubscription = isSubscriptionActive(currentSubscriptionQuery.data);

  const packageQuery = useSubscriptionPackageById(packageId || undefined);

  const featureMap = useMemo(() => {
    if (!currentSubscriptionQuery.data || !isSubscriptionActive(currentSubscriptionQuery.data)) return {};
    return buildFeatureAccessMap(packageQuery.data?.features || []);
  }, [currentSubscriptionQuery.data, packageQuery.data]);

  return {
    currentSubscription: currentSubscriptionQuery.data,
    packageId,
    featureMap,
    hasActiveSubscription,
    loading: currentSubscriptionQuery.isLoading || packageQuery.isLoading,
  };
};
