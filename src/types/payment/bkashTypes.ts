import type { Enums, Tables } from "@/integrations/supabase/types";

export type BkashEnvironmentMode = "sandbox" | "live";
export type BkashConnectionStatus = Enums<"payment_connection_status">;
export type BkashLogStatus = Enums<"payment_log_status">;
export type BkashProviderName = "bkash";

export interface BkashApiEndpointMap {
  base_url: string;
  grant_token_endpoint: string;
  refresh_token_endpoint: string;
  create_payment_endpoint?: string;
  execute_payment_endpoint?: string;
  query_payment_endpoint?: string;
  refund_endpoint?: string;
  search_transaction_endpoint?: string;
  agreement_status_endpoint?: string;
  cancel_agreement_endpoint?: string;
  payment_status_endpoint?: string;
  confirm_endpoint?: string;
}

export interface BkashStandardCredentials {
  username: string;
  password: string;
  app_key: string;
  app_secret: string;
}

export interface BkashTokenizedCredentials {
  username: string;
  password: string;
  app_key: string;
  app_secret: string;
}

export interface BkashGeneralSettings {
  is_enabled: boolean;
  payment_title: string;
  payment_description: string;
  currency: string;
  mode: BkashEnvironmentMode;
  show_on_checkout: boolean;
  enable_logging: boolean;
  enable_tokenized: boolean;
}

export interface BkashCallbackSettings {
  callback_base_url: string;
  success_url: string;
  failure_url: string;
  cancel_url: string;
  redirect_success_url: string;
  redirect_failure_url: string;
  redirect_cancel_url: string;
}

export interface BkashMaskedCredentialSummary {
  standard_username: string | null;
  standard_password: string | null;
  standard_app_key: string | null;
  standard_app_secret: string | null;
  tokenized_username: string | null;
  tokenized_password: string | null;
  tokenized_app_key: string | null;
  tokenized_app_secret: string | null;
}

export interface BkashGatewaySettings {
  id: string;
  provider_name: BkashProviderName;
  display_name: string;
  general: BkashGeneralSettings;
  standard_endpoints: Required<
    Pick<
      BkashApiEndpointMap,
      | "base_url"
      | "grant_token_endpoint"
      | "refresh_token_endpoint"
      | "create_payment_endpoint"
      | "execute_payment_endpoint"
      | "query_payment_endpoint"
      | "refund_endpoint"
      | "search_transaction_endpoint"
    >
  >;
  tokenized_endpoints: Required<
    Pick<
      BkashApiEndpointMap,
      | "base_url"
      | "grant_token_endpoint"
      | "refresh_token_endpoint"
      | "create_payment_endpoint"
      | "execute_payment_endpoint"
      | "agreement_status_endpoint"
      | "cancel_agreement_endpoint"
      | "payment_status_endpoint"
      | "confirm_endpoint"
      | "refund_endpoint"
      | "search_transaction_endpoint"
    >
  >;
  callback_settings: BkashCallbackSettings;
  credentials: {
    standard: BkashStandardCredentials;
    tokenized: BkashTokenizedCredentials;
  };
}

export interface BkashSettingsPayload extends Omit<BkashGatewaySettings, "id" | "provider_name"> {}

export interface BkashPublicConfig {
  provider_name: BkashProviderName;
  payment_title: string;
  payment_description: string | null;
  currency: string;
  environment_mode: BkashEnvironmentMode;
  show_on_checkout: boolean;
  is_enabled: boolean;
  enable_tokenized: boolean;
}

export interface BkashTokenStatus {
  token_type: "standard" | "tokenized";
  token_exists: boolean;
  token_masked: string | null;
  expires_at: string | null;
  last_refreshed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BkashLogItem {
  id: string;
  provider_name: string;
  log_type: string;
  endpoint_name: string | null;
  request_payload: unknown;
  response_payload: unknown;
  status: BkashLogStatus;
  http_status: number | null;
  message: string | null;
  created_at: string;
}

export interface BkashConnectionTestResult {
  ok: boolean;
  status: BkashConnectionStatus;
  mode: BkashEnvironmentMode;
  token_type: "standard" | "tokenized";
  status_code: number | null;
  message: string;
  endpoint: string | null;
  tested_at: string;
  token_status?: BkashTokenStatus | null;
}

export interface BkashValidationIssue {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface BkashValidationResult {
  ok: boolean;
  mode: BkashEnvironmentMode;
  issues: BkashValidationIssue[];
  checked_at: string;
}

export interface BkashMaskedAdminSettingsResponse {
  settings: Omit<BkashGatewaySettings, "credentials"> & {
    credentials: {
      standard: BkashStandardCredentials;
      tokenized: BkashTokenizedCredentials;
    };
  };
  connection_statuses: {
    standard: BkashConnectionStatus;
    tokenized: BkashConnectionStatus;
    standard_tested_at: string | null;
    tokenized_tested_at: string | null;
    standard_message: string | null;
    tokenized_message: string | null;
  };
  masked_summary: BkashMaskedCredentialSummary;
  token_statuses: BkashTokenStatus[];
  latest_logs: BkashLogItem[];
}

export interface BkashClearTokenCacheResult {
  ok: boolean;
  cleared_types: Array<"standard" | "tokenized">;
  message: string;
  cleared_at: string;
}

export type PaymentGatewaySettingsRow = Tables<"payment_gateway_settings">;
export type PaymentGatewayLogRow = Tables<"payment_gateway_logs">;
export type PaymentGatewayTokenRow = Tables<"payment_gateway_tokens">;

export const BKASH_STANDARD_TOKEN_TYPE = "standard" as const;
export const BKASH_TOKENIZED_TOKEN_TYPE = "tokenized" as const;

export const createEmptyBkashSettings = (): BkashSettingsPayload => ({
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
    base_url: "https://tokenized.sandbox.bka.sh/v1.2.0-beta",
    grant_token_endpoint: "/tokenized/checkout/token/grant",
    refresh_token_endpoint: "/tokenized/checkout/token/refresh",
    create_payment_endpoint: "/tokenized/checkout/create",
    execute_payment_endpoint: "/tokenized/checkout/execute",
    query_payment_endpoint: "/tokenized/checkout/payment/status",
    refund_endpoint: "/tokenized/checkout/payment/refund",
    search_transaction_endpoint: "/tokenized/checkout/general/searchTransaction",
  },
  tokenized_endpoints: {
    base_url: "https://tokenized.sandbox.bka.sh/v1.2.0-beta",
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
    standard: {
      username: "",
      password: "",
      app_key: "",
      app_secret: "",
    },
    tokenized: {
      username: "",
      password: "",
      app_key: "",
      app_secret: "",
    },
  },
});
