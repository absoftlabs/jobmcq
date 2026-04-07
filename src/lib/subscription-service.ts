import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import {
  calculateSubscriptionEndDate,
  getEffectivePrice,
  type SubscriptionFeatureRow,
  type SubscriptionOrderRow,
  type SubscriptionPackageRow,
  type SubscriptionPackageWithFeatures,
  type SubscriptionSettingsRow,
  type UserSubscriptionRow,
} from "@/lib/subscription-utils";

type PackageInsert = TablesInsert<"subscription_packages">;
type PackageUpdate = TablesUpdate<"subscription_packages">;
type PackageFeatureInsert = TablesInsert<"subscription_package_features">;
type SubscriptionOrderInsert = TablesInsert<"subscription_orders">;
type UserSubscriptionInsert = TablesInsert<"user_subscriptions">;
type SubscriptionSettingsUpdate = TablesUpdate<"subscription_settings">;

export interface PackageFormValues {
  package: PackageInsert;
  features: Array<Omit<PackageFeatureInsert, "package_id"> & { id?: string }>;
}

export const fetchAdminPackages = async (): Promise<SubscriptionPackageWithFeatures[]> => {
  const { data, error } = await supabase
    .from("subscription_packages")
    .select("*, subscription_package_features(*)")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data || []).map((row) => ({
    ...(row as unknown as SubscriptionPackageRow),
    features: ((row as { subscription_package_features?: SubscriptionFeatureRow[] }).subscription_package_features || []).sort(
      (a, b) => a.sort_order - b.sort_order,
    ),
  }));
};

export const fetchPricingPackages = async (homepageOnly = false): Promise<SubscriptionPackageWithFeatures[]> => {
  let query = supabase
    .from("subscription_packages")
    .select("*, subscription_package_features(*)")
    .eq("active", true)
    .eq("show_on_pricing_page", true)
    .order("sort_order", { ascending: true });

  if (homepageOnly) {
    query = query.eq("show_on_homepage", true);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row) => ({
    ...(row as unknown as SubscriptionPackageRow),
    features: ((row as { subscription_package_features?: SubscriptionFeatureRow[] }).subscription_package_features || [])
      .filter((feature) => feature.is_active)
      .sort((a, b) => a.sort_order - b.sort_order),
  }));
};

export const fetchPackageBySlug = async (slug: string): Promise<SubscriptionPackageWithFeatures | null> => {
  const { data, error } = await supabase
    .from("subscription_packages")
    .select("*, subscription_package_features(*)")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...(data as unknown as SubscriptionPackageRow),
    features: ((data as { subscription_package_features?: SubscriptionFeatureRow[] }).subscription_package_features || []).sort(
      (a, b) => a.sort_order - b.sort_order,
    ),
  };
};

export const fetchPackageById = async (id: string): Promise<SubscriptionPackageWithFeatures | null> => {
  const { data, error } = await supabase
    .from("subscription_packages")
    .select("*, subscription_package_features(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...(data as unknown as SubscriptionPackageRow),
    features: ((data as { subscription_package_features?: SubscriptionFeatureRow[] }).subscription_package_features || []).sort(
      (a, b) => a.sort_order - b.sort_order,
    ),
  };
};

export const fetchSubscriptionSettings = async (): Promise<SubscriptionSettingsRow> => {
  const { data, error } = await supabase.from("subscription_settings").select("*").eq("id", 1).single();
  if (error) throw error;
  return data as SubscriptionSettingsRow;
};

export const saveSubscriptionSettings = async (payload: SubscriptionSettingsUpdate) => {
  const { data, error } = await supabase
    .from("subscription_settings")
    .upsert({ id: 1, ...payload }, { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw error;
  return data as SubscriptionSettingsRow;
};

export const saveSubscriptionPackage = async (values: PackageFormValues) => {
  const { package: packageValues, features } = values;
  const packageId = packageValues.id;

  let savedPackage: SubscriptionPackageRow;

  if (packageId) {
    const { data, error } = await supabase
      .from("subscription_packages")
      .update(packageValues as PackageUpdate)
      .eq("id", packageId)
      .select("*")
      .single();
    if (error) throw error;
    savedPackage = data as SubscriptionPackageRow;
  } else {
    const { data, error } = await supabase
      .from("subscription_packages")
      .insert(packageValues)
      .select("*")
      .single();
    if (error) throw error;
    savedPackage = data as SubscriptionPackageRow;
  }

  const { error: deleteError } = await supabase
    .from("subscription_package_features")
    .delete()
    .eq("package_id", savedPackage.id);
  if (deleteError) throw deleteError;

  if (features.length > 0) {
    const preparedFeatures: PackageFeatureInsert[] = features.map((feature, index) => ({
      package_id: savedPackage.id,
      feature_key: feature.feature_key,
      feature_label: feature.feature_label,
      feature_value: feature.feature_value,
      feature_type: feature.feature_type,
      icon_type: feature.icon_type,
      is_highlighted: feature.is_highlighted,
      sort_order: index + 1,
      is_active: feature.is_active,
    }));

    const { error: featureError } = await supabase.from("subscription_package_features").insert(preparedFeatures);
    if (featureError) throw featureError;
  }

  return savedPackage;
};

export const duplicateSubscriptionPackage = async (pkg: SubscriptionPackageWithFeatures) => {
  const copyPackage: PackageInsert = {
    ...pkg,
    id: undefined,
    name: `${pkg.name} Copy`,
    slug: `${pkg.slug}-copy-${Date.now()}`,
    created_at: undefined,
    updated_at: undefined,
  };

  const copyFeatures = pkg.features.map((feature) => ({
    id: undefined,
    feature_key: feature.feature_key,
    feature_label: feature.feature_label,
    feature_value: feature.feature_value,
    feature_type: feature.feature_type,
    icon_type: feature.icon_type,
    is_highlighted: feature.is_highlighted,
    sort_order: feature.sort_order,
    is_active: feature.is_active,
    created_at: undefined,
  }));

  return saveSubscriptionPackage({ package: copyPackage, features: copyFeatures });
};

export const deleteSubscriptionPackage = async (packageId: string) => {
  const { error } = await supabase.from("subscription_packages").delete().eq("id", packageId);
  if (error) throw error;
};

export const toggleSubscriptionPackageStatus = async (pkg: SubscriptionPackageRow) => {
  const { data, error } = await supabase
    .from("subscription_packages")
    .update({ active: !pkg.active })
    .eq("id", pkg.id)
    .select("*")
    .single();
  if (error) throw error;
  return data as SubscriptionPackageRow;
};

export const fetchUserSubscriptions = async (userId: string): Promise<UserSubscriptionRow[]> => {
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as UserSubscriptionRow[];
};

export const fetchUserOrders = async (userId: string): Promise<SubscriptionOrderRow[]> => {
  const { data, error } = await supabase
    .from("subscription_orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as SubscriptionOrderRow[];
};

export const fetchCurrentSubscription = async (userId: string): Promise<UserSubscriptionRow | null> => {
  const subscriptions = await fetchUserSubscriptions(userId);
  return subscriptions[0] || null;
};

export const activateSubscriptionForUser = async (
  userId: string,
  pkg: SubscriptionPackageRow,
  order: SubscriptionOrderRow,
) => {
  const startDate = new Date().toISOString();
  const endDate = calculateSubscriptionEndDate(pkg, new Date(startDate));
  const subscriptionStatus = pkg.is_lifetime ? "lifetime" : "active";

  const { data: previousSubscriptions, error: previousError } = await supabase
    .from("user_subscriptions")
    .update({ subscription_status: "expired" })
    .eq("user_id", userId)
    .in("subscription_status", ["active", "pending", "lifetime"])
    .select("id");

  if (previousError) throw previousError;

  const subscriptionPayload: UserSubscriptionInsert = {
    user_id: userId,
    package_id: pkg.id,
    package_name: pkg.name,
    start_date: startDate,
    end_date: endDate,
    renewal_date: endDate,
    is_lifetime: pkg.is_lifetime,
    payment_status: "paid",
    subscription_status: subscriptionStatus,
    amount_paid: getEffectivePrice(pkg),
    currency: pkg.currency,
    transaction_id: order.transaction_id,
    order_id: order.id,
    metadata: {
      previous_subscription_ids: previousSubscriptions?.map((item) => item.id) || [],
    },
  };

  const { data: createdSubscription, error: subscriptionError } = await supabase
    .from("user_subscriptions")
    .insert(subscriptionPayload)
    .select("*")
    .single();
  if (subscriptionError) throw subscriptionError;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      current_package_id: pkg.id,
      current_subscription_id: createdSubscription.id,
    })
    .eq("user_id", userId);
  if (profileError) throw profileError;

  return createdSubscription as UserSubscriptionRow;
};

export const createSubscriptionPurchase = async ({
  userId,
  pkg,
  paymentMethod,
  transactionId,
  orderNotes,
}: {
  userId: string;
  pkg: SubscriptionPackageRow;
  paymentMethod: string;
  transactionId?: string;
  orderNotes?: string;
}) => {
  const orderPayload: SubscriptionOrderInsert = {
    user_id: userId,
    package_id: pkg.id,
    amount: getEffectivePrice(pkg),
    currency: pkg.currency,
    payment_method: paymentMethod,
    payment_status: "paid",
    transaction_id: transactionId || null,
    order_notes: orderNotes || null,
    metadata: {
      package_slug: pkg.slug,
      package_duration_type: pkg.duration_type,
      package_duration_value: pkg.duration_value,
    },
  };

  const { data: orderData, error: orderError } = await supabase
    .from("subscription_orders")
    .insert(orderPayload)
    .select("*")
    .single();
  if (orderError) throw orderError;

  const order = orderData as SubscriptionOrderRow;
  const subscription = await activateSubscriptionForUser(userId, pkg, order);

  return { order, subscription };
};
