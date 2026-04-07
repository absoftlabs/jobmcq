import { decryptSecret, encryptSecret, maskSecret } from "./crypto.ts";
import type { BkashGatewaySettingsPayload, BkashTokenType } from "./types.ts";

const emptySettings = (): BkashGatewaySettingsPayload => ({
  display_name: "bKash",
  general: {
    is_enabled: false,
    payment_title: "Pay with bKash",
    payment_description: "Pay securely with bKash checkout.",
    currency: "BDT",
    mode: "sandbox",
    show_on_checkout: true,
    enable_logging: true,
    enable_tokenized: false,
  },
  standard_endpoints: {
    base_url: "",
    grant_token_endpoint: "/tokenized/checkout/token/grant",
    refresh_token_endpoint: "/tokenized/checkout/token/refresh",
    create_payment_endpoint: "/tokenized/checkout/create",
    execute_payment_endpoint: "/tokenized/checkout/execute",
    query_payment_endpoint: "/tokenized/checkout/payment/status",
    refund_endpoint: "/tokenized/checkout/payment/refund",
    search_transaction_endpoint: "/tokenized/checkout/general/searchTransaction",
  },
  tokenized_endpoints: {
    base_url: "",
    grant_token_endpoint: "/tokenized/checkout/token/grant",
    refresh_token_endpoint: "/tokenized/checkout/token/refresh",
    create_payment_endpoint: "/tokenized/checkout/create",
    execute_payment_endpoint: "/tokenized/checkout/execute",
    agreement_status_endpoint: "/tokenized/checkout/agreement/status",
    cancel_agreement_endpoint: "/tokenized/checkout/agreement/cancel",
    payment_status_endpoint: "/tokenized/checkout/payment/status",
    confirm_endpoint: "/tokenized/checkout/payment/confirm",
    refund_endpoint: "/tokenized/checkout/payment/refund",
    search_transaction_endpoint: "/tokenized/checkout/general/searchTransaction",
  },
  callback_settings: {
    callback_base_url: "",
    success_url: "",
    failure_url: "",
    cancel_url: "",
    redirect_success_url: "",
    redirect_failure_url: "",
    redirect_cancel_url: "",
  },
  credentials: {
    standard: { username: "", password: "", app_key: "", app_secret: "" },
    tokenized: { username: "", password: "", app_key: "", app_secret: "" },
  },
});

export const getBkashSettingsRow = async (service: ReturnType<typeof import("./clients.ts").createServiceClient>) => {
  const { data, error } = await service
    .from("payment_gateway_settings")
    .select("*")
    .eq("provider", "bkash")
    .single();

  if (error) throw error;
  return data;
};

export const toMaskedAdminResponse = async (
  service: ReturnType<typeof import("./clients.ts").createServiceClient>,
  row: Record<string, unknown>,
) => {
  const { data: tokenStatuses } = await service.rpc("get_bkash_token_statuses");
  const { data: latestLogs } = await service
    .from("payment_gateway_logs")
    .select("*")
    .eq("provider_name", "bkash")
    .order("created_at", { ascending: false })
    .limit(10);

  return {
    settings: {
      display_name: String(row.display_name ?? "bKash"),
      general: {
        is_enabled: Boolean(row.is_enabled),
        payment_title: String(row.payment_title ?? "Pay with bKash"),
        payment_description: String(row.payment_description ?? ""),
        currency: String(row.currency ?? "BDT"),
        mode: Boolean(row.is_sandbox) ? "sandbox" : "live",
        show_on_checkout: Boolean(row.show_on_checkout ?? true),
        enable_logging: Boolean(row.enable_logging ?? true),
        enable_tokenized: Boolean(row.enable_tokenized ?? false),
      },
      standard_endpoints: {
        base_url: String(row.standard_base_url ?? ""),
        grant_token_endpoint: String(row.standard_grant_token_endpoint ?? ""),
        refresh_token_endpoint: String(row.standard_refresh_token_endpoint ?? ""),
        create_payment_endpoint: String(row.standard_create_payment_endpoint ?? ""),
        execute_payment_endpoint: String(row.standard_execute_payment_endpoint ?? ""),
        query_payment_endpoint: String(row.standard_query_payment_endpoint ?? ""),
        refund_endpoint: String(row.standard_refund_endpoint ?? ""),
        search_transaction_endpoint: String(row.standard_search_transaction_endpoint ?? ""),
      },
      tokenized_endpoints: {
        base_url: String(row.tokenized_base_url ?? ""),
        grant_token_endpoint: String(row.tokenized_grant_token_endpoint ?? ""),
        refresh_token_endpoint: String(row.tokenized_refresh_token_endpoint ?? ""),
        create_payment_endpoint: String(row.tokenized_create_endpoint ?? ""),
        execute_payment_endpoint: String(row.tokenized_execute_endpoint ?? ""),
        agreement_status_endpoint: String(row.tokenized_agreement_status_endpoint ?? ""),
        cancel_agreement_endpoint: String(row.tokenized_cancel_agreement_endpoint ?? ""),
        payment_status_endpoint: String(row.tokenized_payment_status_endpoint ?? ""),
        confirm_endpoint: String(row.tokenized_confirm_endpoint ?? ""),
        refund_endpoint: String(row.tokenized_refund_endpoint ?? ""),
        search_transaction_endpoint: String(row.tokenized_search_transaction_endpoint ?? ""),
      },
      callback_settings: {
        callback_base_url: String(row.callback_base_url ?? ""),
        success_url: String(row.success_url ?? ""),
        failure_url: String(row.failure_url ?? ""),
        cancel_url: String(row.cancel_url ?? ""),
        redirect_success_url: String(row.redirect_success_url ?? ""),
        redirect_failure_url: String(row.redirect_failure_url ?? ""),
        redirect_cancel_url: String(row.redirect_cancel_url ?? ""),
      },
      credentials: {
        standard: { username: "", password: "", app_key: "", app_secret: "" },
        tokenized: { username: "", password: "", app_key: "", app_secret: "" },
      },
    },
    connection_statuses: {
      standard: String(row.last_standard_connection_status ?? "not_tested"),
      tokenized: String(row.last_tokenized_connection_status ?? "not_tested"),
      standard_tested_at: row.last_standard_tested_at ? String(row.last_standard_tested_at) : null,
      tokenized_tested_at: row.last_tokenized_tested_at ? String(row.last_tokenized_tested_at) : null,
      standard_message: row.last_standard_test_message ? String(row.last_standard_test_message) : null,
      tokenized_message: row.last_tokenized_test_message ? String(row.last_tokenized_test_message) : null,
    },
    masked_summary: {
      standard_username: maskSecret(await decryptSecret((row.standard_username_encrypted as string | null) ?? null)),
      standard_password: maskSecret(await decryptSecret((row.standard_password_encrypted as string | null) ?? null)),
      standard_app_key: maskSecret(await decryptSecret((row.standard_app_key_encrypted as string | null) ?? null)),
      standard_app_secret: maskSecret(await decryptSecret((row.standard_app_secret_encrypted as string | null) ?? null)),
      tokenized_username: maskSecret(await decryptSecret((row.tokenized_username_encrypted as string | null) ?? null)),
      tokenized_password: maskSecret(await decryptSecret((row.tokenized_password_encrypted as string | null) ?? null)),
      tokenized_app_key: maskSecret(await decryptSecret((row.tokenized_app_key_encrypted as string | null) ?? null)),
      tokenized_app_secret: maskSecret(await decryptSecret((row.tokenized_app_secret_encrypted as string | null) ?? null)),
    },
    token_statuses: tokenStatuses ?? [],
    latest_logs: latestLogs ?? [],
  };
};

const withExistingSecret = async (incoming: string, existingEncrypted: string | null) => {
  if (incoming.trim()) {
    return encryptSecret(incoming);
  }
  return existingEncrypted;
};

export const saveBkashSettingsRow = async ({
  service,
  payload,
  userId,
}: {
  service: ReturnType<typeof import("./clients.ts").createServiceClient>;
  payload: BkashGatewaySettingsPayload;
  userId: string;
}) => {
  const existing = await getBkashSettingsRow(service);
  const updatePayload = {
    provider: "bkash",
    provider_name: "bkash",
    display_name: payload.display_name,
    payment_title: payload.general.payment_title,
    payment_description: payload.general.payment_description || null,
    currency: payload.general.currency,
    is_enabled: payload.general.is_enabled,
    is_sandbox: payload.general.mode === "sandbox",
    show_on_checkout: payload.general.show_on_checkout,
    enable_logging: payload.general.enable_logging,
    enable_tokenized: payload.general.enable_tokenized,
    callback_base_url: payload.callback_settings.callback_base_url || null,
    success_url: payload.callback_settings.success_url || null,
    failure_url: payload.callback_settings.failure_url || null,
    cancel_url: payload.callback_settings.cancel_url || null,
    redirect_success_url: payload.callback_settings.redirect_success_url || null,
    redirect_failure_url: payload.callback_settings.redirect_failure_url || null,
    redirect_cancel_url: payload.callback_settings.redirect_cancel_url || null,
    standard_username_encrypted: await withExistingSecret(payload.credentials.standard.username, existing.standard_username_encrypted),
    standard_password_encrypted: await withExistingSecret(payload.credentials.standard.password, existing.standard_password_encrypted),
    standard_app_key_encrypted: await withExistingSecret(payload.credentials.standard.app_key, existing.standard_app_key_encrypted),
    standard_app_secret_encrypted: await withExistingSecret(payload.credentials.standard.app_secret, existing.standard_app_secret_encrypted),
    standard_base_url: payload.standard_endpoints.base_url || null,
    standard_grant_token_endpoint: payload.standard_endpoints.grant_token_endpoint,
    standard_refresh_token_endpoint: payload.standard_endpoints.refresh_token_endpoint,
    standard_create_payment_endpoint: payload.standard_endpoints.create_payment_endpoint,
    standard_execute_payment_endpoint: payload.standard_endpoints.execute_payment_endpoint,
    standard_query_payment_endpoint: payload.standard_endpoints.query_payment_endpoint,
    standard_refund_endpoint: payload.standard_endpoints.refund_endpoint,
    standard_search_transaction_endpoint: payload.standard_endpoints.search_transaction_endpoint,
    tokenized_username_encrypted: await withExistingSecret(payload.credentials.tokenized.username, existing.tokenized_username_encrypted),
    tokenized_password_encrypted: await withExistingSecret(payload.credentials.tokenized.password, existing.tokenized_password_encrypted),
    tokenized_app_key_encrypted: await withExistingSecret(payload.credentials.tokenized.app_key, existing.tokenized_app_key_encrypted),
    tokenized_app_secret_encrypted: await withExistingSecret(payload.credentials.tokenized.app_secret, existing.tokenized_app_secret_encrypted),
    tokenized_base_url: payload.tokenized_endpoints.base_url || null,
    tokenized_grant_token_endpoint: payload.tokenized_endpoints.grant_token_endpoint,
    tokenized_refresh_token_endpoint: payload.tokenized_endpoints.refresh_token_endpoint,
    tokenized_create_endpoint: payload.tokenized_endpoints.create_payment_endpoint,
    tokenized_execute_endpoint: payload.tokenized_endpoints.execute_payment_endpoint,
    tokenized_agreement_status_endpoint: payload.tokenized_endpoints.agreement_status_endpoint,
    tokenized_cancel_agreement_endpoint: payload.tokenized_endpoints.cancel_agreement_endpoint,
    tokenized_payment_status_endpoint: payload.tokenized_endpoints.payment_status_endpoint,
    tokenized_confirm_endpoint: payload.tokenized_endpoints.confirm_endpoint,
    tokenized_refund_endpoint: payload.tokenized_endpoints.refund_endpoint,
    tokenized_search_transaction_endpoint: payload.tokenized_endpoints.search_transaction_endpoint,
    updated_by: userId,
  };

  const { data, error } = await service
    .from("payment_gateway_settings")
    .update(updatePayload)
    .eq("provider", "bkash")
    .select("*")
    .single();

  if (error) throw error;
  return data;
};

export const getResolvedCredentials = async (
  row: Record<string, unknown>,
  tokenType: BkashTokenType,
) => {
  if (tokenType === "standard") {
    return {
      username: await decryptSecret((row.standard_username_encrypted as string | null) ?? null),
      password: await decryptSecret((row.standard_password_encrypted as string | null) ?? null),
      app_key: await decryptSecret((row.standard_app_key_encrypted as string | null) ?? null),
      app_secret: await decryptSecret((row.standard_app_secret_encrypted as string | null) ?? null),
    };
  }

  return {
    username: await decryptSecret((row.tokenized_username_encrypted as string | null) ?? null),
    password: await decryptSecret((row.tokenized_password_encrypted as string | null) ?? null),
    app_key: await decryptSecret((row.tokenized_app_key_encrypted as string | null) ?? null),
    app_secret: await decryptSecret((row.tokenized_app_secret_encrypted as string | null) ?? null),
  };
};

export const buildPayloadFromRow = async (row: Record<string, unknown>) => {
  const payload = emptySettings();
  payload.display_name = String(row.display_name ?? "bKash");
  payload.general.is_enabled = Boolean(row.is_enabled);
  payload.general.payment_title = String(row.payment_title ?? "");
  payload.general.payment_description = String(row.payment_description ?? "");
  payload.general.currency = String(row.currency ?? "BDT");
  payload.general.mode = Boolean(row.is_sandbox) ? "sandbox" : "live";
  payload.general.show_on_checkout = Boolean(row.show_on_checkout ?? true);
  payload.general.enable_logging = Boolean(row.enable_logging ?? true);
  payload.general.enable_tokenized = Boolean(row.enable_tokenized ?? false);
  payload.standard_endpoints.base_url = String(row.standard_base_url ?? "");
  payload.standard_endpoints.grant_token_endpoint = String(row.standard_grant_token_endpoint ?? "");
  payload.standard_endpoints.refresh_token_endpoint = String(row.standard_refresh_token_endpoint ?? "");
  payload.standard_endpoints.create_payment_endpoint = String(row.standard_create_payment_endpoint ?? "");
  payload.standard_endpoints.execute_payment_endpoint = String(row.standard_execute_payment_endpoint ?? "");
  payload.standard_endpoints.query_payment_endpoint = String(row.standard_query_payment_endpoint ?? "");
  payload.standard_endpoints.refund_endpoint = String(row.standard_refund_endpoint ?? "");
  payload.standard_endpoints.search_transaction_endpoint = String(row.standard_search_transaction_endpoint ?? "");
  payload.tokenized_endpoints.base_url = String(row.tokenized_base_url ?? "");
  payload.tokenized_endpoints.grant_token_endpoint = String(row.tokenized_grant_token_endpoint ?? "");
  payload.tokenized_endpoints.refresh_token_endpoint = String(row.tokenized_refresh_token_endpoint ?? "");
  payload.tokenized_endpoints.create_payment_endpoint = String(row.tokenized_create_endpoint ?? "");
  payload.tokenized_endpoints.execute_payment_endpoint = String(row.tokenized_execute_endpoint ?? "");
  payload.tokenized_endpoints.agreement_status_endpoint = String(row.tokenized_agreement_status_endpoint ?? "");
  payload.tokenized_endpoints.cancel_agreement_endpoint = String(row.tokenized_cancel_agreement_endpoint ?? "");
  payload.tokenized_endpoints.payment_status_endpoint = String(row.tokenized_payment_status_endpoint ?? "");
  payload.tokenized_endpoints.confirm_endpoint = String(row.tokenized_confirm_endpoint ?? "");
  payload.tokenized_endpoints.refund_endpoint = String(row.tokenized_refund_endpoint ?? "");
  payload.tokenized_endpoints.search_transaction_endpoint = String(row.tokenized_search_transaction_endpoint ?? "");
  payload.callback_settings.callback_base_url = String(row.callback_base_url ?? "");
  payload.callback_settings.success_url = String(row.success_url ?? "");
  payload.callback_settings.failure_url = String(row.failure_url ?? "");
  payload.callback_settings.cancel_url = String(row.cancel_url ?? "");
  payload.callback_settings.redirect_success_url = String(row.redirect_success_url ?? "");
  payload.callback_settings.redirect_failure_url = String(row.redirect_failure_url ?? "");
  payload.callback_settings.redirect_cancel_url = String(row.redirect_cancel_url ?? "");
  payload.credentials.standard = await getResolvedCredentials(row, "standard");
  payload.credentials.tokenized = await getResolvedCredentials(row, "tokenized");
  return payload;
};
