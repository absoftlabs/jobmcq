import { getEffectivePriceForPackage } from "./subscription_utils.ts";

export const activateSubscriptionFromOrder = async ({
  service,
  userId,
  pkg,
  order,
  paymentReference,
}: {
  service: ReturnType<typeof import("./clients.ts").createServiceClient>;
  userId: string;
  pkg: { id: string; name: string; currency: string; duration_type: string; duration_value: number | null; is_lifetime: boolean };
  order: { id: string; amount: number; currency: string };
  paymentReference: string | null;
}) => {
  const startDate = new Date();
  const endDate = calculateSubscriptionEndDate(pkg, startDate);
  const status = pkg.is_lifetime ? "lifetime" : "active";

  await service
    .from("user_subscriptions")
    .update({ subscription_status: "expired" })
    .eq("user_id", userId)
    .in("subscription_status", ["active", "pending", "lifetime"]);

  const { data: subscription, error } = await service
    .from("user_subscriptions")
    .insert({
      user_id: userId,
      package_id: pkg.id,
      package_name: pkg.name,
      start_date: startDate.toISOString(),
      end_date: endDate,
      renewal_date: endDate,
      is_lifetime: pkg.is_lifetime,
      payment_status: "paid",
      subscription_status: status,
      amount_paid: Number(order.amount || getEffectivePriceForPackage(pkg)),
      currency: order.currency || pkg.currency,
      transaction_id: paymentReference,
      order_id: order.id,
      metadata: {},
    })
    .select("*")
    .single();

  if (error) throw error;

  await service
    .from("profiles")
    .update({
      current_package_id: pkg.id,
      current_subscription_id: subscription.id,
    })
    .eq("user_id", userId);

  return subscription;
};

export const calculateSubscriptionEndDate = (
  pkg: { duration_type: string; duration_value: number | null; is_lifetime: boolean },
  startDate: Date,
) => {
  if (pkg.is_lifetime || pkg.duration_type === "lifetime") return null;
  const end = new Date(startDate);
  const value = pkg.duration_value || 0;
  if (pkg.duration_type === "days") end.setDate(end.getDate() + value);
  if (pkg.duration_type === "months") end.setMonth(end.getMonth() + value);
  if (pkg.duration_type === "years") end.setFullYear(end.getFullYear() + value);
  return end.toISOString();
};
