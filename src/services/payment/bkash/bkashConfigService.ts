import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type {
  BkashClearTokenCacheResult,
  BkashConnectionTestResult,
  BkashLogItem,
  BkashMaskedAdminSettingsResponse,
  BkashPublicConfig,
  BkashSettingsPayload,
  BkashTokenStatus,
  BkashValidationResult,
} from "@/types/payment/bkashTypes";

const invoke = async <TResponse, TPayload = undefined>(name: string, body?: TPayload): Promise<TResponse> => {
  const {
    data: { session: initialSession },
  } = await supabase.auth.getSession();

  let session = initialSession;
  const isExpired = !session?.expires_at || session.expires_at * 1000 <= Date.now() + 30_000;

  if (!session || isExpired) {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      throw new Error("Session expired. Please log in again.");
    }
    session = data.session;
  }

  const accessToken = session?.access_token?.trim();

  if (!accessToken) {
    throw new Error("Admin session not found. Please log in again.");
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body === undefined ? {} : body),
  });

  const raw = await response.text();
  let data: unknown = null;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = { message: raw };
  }

  if (!response.ok) {
    const message =
      (data && typeof data === "object" && "error" in data && typeof data.error === "string" && data.error) ||
      (data && typeof data === "object" && "message" in data && typeof data.message === "string" && data.message) ||
      `Edge function returned ${response.status}`;
    throw new Error(message);
  }

  return data as TResponse;
};

export const fetchBkashAdminSettings = () =>
  invoke<BkashMaskedAdminSettingsResponse>("bkash-get-settings");

export const saveBkashSettings = (payload: BkashSettingsPayload) =>
  invoke<BkashMaskedAdminSettingsResponse, BkashSettingsPayload>("bkash-save-settings", payload);

export const testBkashStandardConnection = () =>
  invoke<BkashConnectionTestResult>("bkash-test-standard");

export const testBkashTokenizedConnection = () =>
  invoke<BkashConnectionTestResult>("bkash-test-tokenized");

export const clearBkashTokenCache = () =>
  invoke<BkashClearTokenCacheResult>("bkash-clear-token-cache");

export const validateBkashConfig = () =>
  invoke<BkashValidationResult>("bkash-validate-config");

export const fetchBkashPublicConfig = async (): Promise<BkashPublicConfig | null> => {
  const { data, error } = await supabase.rpc("get_public_bkash_config");
  if (error) throw error;
  return ((data as BkashPublicConfig[] | null) || [])[0] || null;
};

export const fetchBkashTokenStatuses = async (): Promise<BkashTokenStatus[]> => {
  const { data, error } = await supabase.rpc("get_bkash_token_statuses");
  if (error) throw error;
  return (data || []) as BkashTokenStatus[];
};

export const fetchBkashLogs = async (limit = 20): Promise<BkashLogItem[]> => {
  const { data, error } = await supabase
    .from("payment_gateway_logs")
    .select("*")
    .eq("provider_name", "bkash")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as Tables<"payment_gateway_logs">[] as BkashLogItem[];
};

export const isBkashAvailableForCheckout = async () => {
  const config = await fetchBkashPublicConfig();
  return Boolean(config?.is_enabled && config?.show_on_checkout);
};

export const isBkashTokenizedEnabled = async () => {
  const config = await fetchBkashPublicConfig();
  return Boolean(config?.is_enabled && config?.enable_tokenized);
};

export const initiateBkashSubscriptionPayment = async ({
  packageId,
  successUrl,
  failureUrl,
  cancelUrl,
}: {
  packageId: string;
  successUrl: string;
  failureUrl: string;
  cancelUrl: string;
}) =>
  invoke<{ ok: boolean; orderId: string; paymentId: string; redirectUrl: string }, {
    packageId: string;
    successUrl: string;
    failureUrl: string;
    cancelUrl: string;
  }>("bkash-subscription-initiate", {
    packageId,
    successUrl,
    failureUrl,
    cancelUrl,
  });
