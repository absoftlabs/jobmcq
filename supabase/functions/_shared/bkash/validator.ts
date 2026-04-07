import type { BkashGatewaySettingsPayload } from "./types.ts";

const isValidUrl = (value: string) => {
  if (!value) return false;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
};

const isSandboxUrl = (value: string) => /sandbox|demo|test/i.test(value);

export const validateBkashPayload = (payload: BkashGatewaySettingsPayload) => {
  const issues: Array<{ field: string; message: string; severity: "error" | "warning" }> = [];
  const mode = payload.general.mode;

  const required = (field: string, label: string, value: string) => {
    if (!value.trim()) issues.push({ field, message: `${label} is required`, severity: "error" });
  };

  required("general.payment_title", "Payment title", payload.general.payment_title);
  required("general.currency", "Currency", payload.general.currency);

  if (payload.general.is_enabled && !payload.general.enable_tokenized) {
    required("credentials.standard.username", "Standard API Username", payload.credentials.standard.username);
    required("credentials.standard.password", "Standard API Password", payload.credentials.standard.password);
    if (!payload.credentials.standard.app_key.trim()) issues.push({ field: "credentials.standard.app_key", message: "Missing Standard API App Key", severity: "error" });
    if (!payload.credentials.standard.app_secret.trim()) issues.push({ field: "credentials.standard.app_secret", message: "Missing Standard API App Secret", severity: "error" });
  }

  if (payload.general.enable_tokenized) {
    required("credentials.tokenized.username", "Tokenized Username", payload.credentials.tokenized.username);
    required("credentials.tokenized.password", "Tokenized Password", payload.credentials.tokenized.password);
    if (!payload.credentials.tokenized.app_key.trim()) issues.push({ field: "credentials.tokenized.app_key", message: "Missing Tokenized App Key", severity: "error" });
    if (!payload.credentials.tokenized.app_secret.trim()) issues.push({ field: "credentials.tokenized.app_secret", message: "Missing Tokenized App Secret", severity: "error" });
  }

  for (const [field, value] of Object.entries(payload.callback_settings)) {
    if (value && !isValidUrl(value)) {
      issues.push({ field: `callback_settings.${field}`, message: "Callback URL is invalid", severity: "error" });
    }
  }

  if (!payload.general.enable_tokenized && payload.standard_endpoints.base_url && !isValidUrl(payload.standard_endpoints.base_url)) {
    issues.push({ field: "standard_endpoints.base_url", message: "Base URL must be valid HTTPS URL", severity: "error" });
  }

  if (payload.tokenized_endpoints.base_url && !isValidUrl(payload.tokenized_endpoints.base_url)) {
    issues.push({ field: "tokenized_endpoints.base_url", message: "Tokenized Base URL must be valid HTTPS URL", severity: "error" });
  }

  if (!payload.general.enable_tokenized && mode === "sandbox" && payload.standard_endpoints.base_url && !isSandboxUrl(payload.standard_endpoints.base_url)) {
    issues.push({ field: "standard_endpoints.base_url", message: "Sandbox mode is enabled but live URL detected", severity: "warning" });
  }

  if (!payload.general.enable_tokenized && mode === "live" && isSandboxUrl(payload.standard_endpoints.base_url)) {
    issues.push({ field: "standard_endpoints.base_url", message: "Live mode is enabled but sandbox base URL is configured", severity: "warning" });
  }

  if (mode === "live" && isSandboxUrl(payload.tokenized_endpoints.base_url)) {
    issues.push({ field: "tokenized_endpoints.base_url", message: "Live mode is enabled but sandbox base URL is configured", severity: "warning" });
  }

  if (payload.general.enable_tokenized && (
    !payload.credentials.tokenized.username.trim() ||
    !payload.credentials.tokenized.password.trim() ||
    !payload.credentials.tokenized.app_key.trim() ||
    !payload.credentials.tokenized.app_secret.trim()
  )) {
    issues.push({ field: "general.enable_tokenized", message: "Tokenized toggle requires tokenized credentials", severity: "warning" });
  }

  return {
    ok: !issues.some((issue) => issue.severity === "error"),
    mode,
    issues,
    checked_at: new Date().toISOString(),
  };
};
