import { useQuery } from "@tanstack/react-query";
import {
  fetchAdminPackages,
  fetchCurrentSubscription,
  fetchPackageById,
  fetchPackageBySlug,
  fetchPricingPackages,
  fetchSubscriptionSettings,
  fetchUserOrders,
  fetchUserSubscriptions,
} from "@/lib/subscription-service";

export const subscriptionQueryKeys = {
  adminPackages: ["subscription-packages", "admin"] as const,
  pricingPackages: ["subscription-packages", "pricing"] as const,
  homepagePackages: ["subscription-packages", "homepage"] as const,
  packageBySlug: (slug: string) => ["subscription-package", slug] as const,
  packageById: (id: string) => ["subscription-package-id", id] as const,
  settings: ["subscription-settings"] as const,
  currentSubscription: (userId?: string) => ["current-subscription", userId] as const,
  subscriptions: (userId?: string) => ["user-subscriptions", userId] as const,
  orders: (userId?: string) => ["subscription-orders", userId] as const,
};

export const useAdminSubscriptionPackages = () =>
  useQuery({
    queryKey: subscriptionQueryKeys.adminPackages,
    queryFn: fetchAdminPackages,
  });

export const usePricingPackages = (homepageOnly = false) =>
  useQuery({
    queryKey: homepageOnly ? subscriptionQueryKeys.homepagePackages : subscriptionQueryKeys.pricingPackages,
    queryFn: () => fetchPricingPackages(homepageOnly),
  });

export const useSubscriptionPackage = (slug: string) =>
  useQuery({
    queryKey: subscriptionQueryKeys.packageBySlug(slug),
    queryFn: () => fetchPackageBySlug(slug),
    enabled: Boolean(slug),
  });

export const useSubscriptionPackageById = (id?: string) =>
  useQuery({
    queryKey: subscriptionQueryKeys.packageById(id || ""),
    queryFn: () => fetchPackageById(id || ""),
    enabled: Boolean(id),
  });

export const useSubscriptionSettings = () =>
  useQuery({
    queryKey: subscriptionQueryKeys.settings,
    queryFn: fetchSubscriptionSettings,
  });

export const useCurrentSubscription = (userId?: string) =>
  useQuery({
    queryKey: subscriptionQueryKeys.currentSubscription(userId),
    queryFn: () => fetchCurrentSubscription(userId || ""),
    enabled: Boolean(userId),
  });

export const useUserSubscriptions = (userId?: string) =>
  useQuery({
    queryKey: subscriptionQueryKeys.subscriptions(userId),
    queryFn: () => fetchUserSubscriptions(userId || ""),
    enabled: Boolean(userId),
  });

export const useUserSubscriptionOrders = (userId?: string) =>
  useQuery({
    queryKey: subscriptionQueryKeys.orders(userId),
    queryFn: () => fetchUserOrders(userId || ""),
    enabled: Boolean(userId),
  });
