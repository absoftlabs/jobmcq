export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type BkashMode = "sandbox" | "live";
export type BkashTokenType = "standard" | "tokenized";
export type ConnectionStatus = "connected" | "failed" | "not_tested";
export type LogStatus = "success" | "error" | "warning" | "info";

export interface BkashGatewaySettingsPayload {
  display_name: string;
  general: {
    is_enabled: boolean;
    payment_title: string;
    payment_description: string;
    currency: string;
    mode: BkashMode;
    show_on_checkout: boolean;
    enable_logging: boolean;
    enable_tokenized: boolean;
  };
  standard_endpoints: {
    base_url: string;
    grant_token_endpoint: string;
    refresh_token_endpoint: string;
    create_payment_endpoint: string;
    execute_payment_endpoint: string;
    query_payment_endpoint: string;
    refund_endpoint: string;
    search_transaction_endpoint: string;
  };
  tokenized_endpoints: {
    base_url: string;
    grant_token_endpoint: string;
    refresh_token_endpoint: string;
    create_payment_endpoint: string;
    execute_payment_endpoint: string;
    agreement_status_endpoint: string;
    cancel_agreement_endpoint: string;
    payment_status_endpoint: string;
    confirm_endpoint: string;
    refund_endpoint: string;
    search_transaction_endpoint: string;
  };
  callback_settings: {
    callback_base_url: string;
    success_url: string;
    failure_url: string;
    cancel_url: string;
    redirect_success_url: string;
    redirect_failure_url: string;
    redirect_cancel_url: string;
  };
  credentials: {
    standard: {
      username: string;
      password: string;
      app_key: string;
      app_secret: string;
    };
    tokenized: {
      username: string;
      password: string;
      app_key: string;
      app_secret: string;
    };
  };
}
