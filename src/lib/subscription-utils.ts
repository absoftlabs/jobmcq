import type { Enums, Tables } from "@/integrations/supabase/types";

export type SubscriptionPackageRow = Tables<"subscription_packages">;
export type SubscriptionFeatureRow = Tables<"subscription_package_features">;
export type SubscriptionOrderRow = Tables<"subscription_orders">;
export type UserSubscriptionRow = Tables<"user_subscriptions">;
export type SubscriptionSettingsRow = Tables<"subscription_settings">;

export type SubscriptionFeatureType = Enums<"package_feature_type">;
export type SubscriptionFeatureIconType = Enums<"package_feature_icon_type">;
export type SubscriptionStatus = Enums<"subscription_status">;
export type SubscriptionPaymentStatus = Enums<"subscription_payment_status">;

export interface SubscriptionPackageWithFeatures extends SubscriptionPackageRow {
  features: SubscriptionFeatureRow[];
}

export interface SubscriptionFeatureAccessValue {
  raw: string | null;
  type: SubscriptionFeatureType;
  enabled: boolean;
  numericValue: number | null;
  textValue: string | null;
}

export type SubscriptionFeatureAccessMap = Record<string, SubscriptionFeatureAccessValue>;

export const slugifyText = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "item";

export const getEffectivePrice = (pkg: SubscriptionPackageRow) =>
  Number(pkg.sale_price ?? pkg.regular_price ?? 0);

export const formatCurrencyLabel = (amount: number | string, currency = "BDT") =>
  `${Number(amount).toFixed(0)} ${currency}`;

export const formatDurationLabel = (pkg: Pick<SubscriptionPackageRow, "duration_type" | "duration_value" | "is_lifetime">) => {
  if (pkg.is_lifetime || pkg.duration_type === "lifetime") return "Lifetime";
  if (!pkg.duration_value) return "Custom";
  if (pkg.duration_type === "days") return `${pkg.duration_value} Day${pkg.duration_value > 1 ? "s" : ""}`;
  if (pkg.duration_type === "months") return `${pkg.duration_value} Month${pkg.duration_value > 1 ? "s" : ""}`;
  return `${pkg.duration_value} Year${pkg.duration_value > 1 ? "s" : ""}`;
};

export const calculateSubscriptionEndDate = (pkg: Pick<SubscriptionPackageRow, "duration_type" | "duration_value" | "is_lifetime">, startDate = new Date()) => {
  if (pkg.is_lifetime || pkg.duration_type === "lifetime") return null;
  const end = new Date(startDate);
  const value = pkg.duration_value || 0;
  if (pkg.duration_type === "days") end.setDate(end.getDate() + value);
  if (pkg.duration_type === "months") end.setMonth(end.getMonth() + value);
  if (pkg.duration_type === "years") end.setFullYear(end.getFullYear() + value);
  return end.toISOString();
};

export const getDaysRemaining = (subscription: Pick<UserSubscriptionRow, "end_date" | "is_lifetime">) => {
  if (subscription.is_lifetime || !subscription.end_date) return null;
  const diff = new Date(subscription.end_date).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

export const isSubscriptionActive = (subscription: Pick<UserSubscriptionRow, "subscription_status" | "payment_status" | "is_lifetime" | "end_date"> | null | undefined) => {
  if (!subscription) return false;
  if (subscription.payment_status !== "paid") return false;
  if (subscription.subscription_status === "lifetime" || subscription.is_lifetime) return true;
  if (subscription.subscription_status !== "active") return false;
  if (!subscription.end_date) return false;
  return new Date(subscription.end_date).getTime() > Date.now();
};

export const buildFeatureAccessMap = (features: SubscriptionFeatureRow[]) =>
  features.reduce<SubscriptionFeatureAccessMap>((accumulator, feature) => {
    const numericValue = feature.feature_value !== null && feature.feature_value !== "" && !Number.isNaN(Number(feature.feature_value))
      ? Number(feature.feature_value)
      : null;
    const lowered = (feature.feature_value || "").toLowerCase();
    const enabled = feature.is_active && (
      feature.feature_type === "unlimited" ||
      (feature.feature_type === "boolean" && ["true", "1", "yes", "enabled"].includes(lowered)) ||
      (feature.feature_type === "number" && (numericValue || 0) > 0) ||
      (feature.feature_type === "text" && Boolean(feature.feature_value)) ||
      feature.feature_type === "not_included"
    );

    accumulator[feature.feature_key] = {
      raw: feature.feature_value,
      type: feature.feature_type,
      enabled: feature.feature_type === "not_included" ? false : enabled,
      numericValue,
      textValue: feature.feature_value,
    };
    return accumulator;
  }, {});

export const canAccessFeature = (featureMap: SubscriptionFeatureAccessMap, featureKey: string) => featureMap[featureKey]?.enabled ?? false;

export const getFeatureDisplayValue = (feature: Pick<SubscriptionFeatureRow, "feature_type" | "feature_value">) => {
  if (feature.feature_type === "boolean") {
    return ["true", "1", "yes", "enabled"].includes((feature.feature_value || "").toLowerCase()) ? "Yes" : "No";
  }
  if (feature.feature_type === "unlimited") return "Unlimited";
  if (feature.feature_type === "not_included") return "Not included";
  return feature.feature_value || "";
};
