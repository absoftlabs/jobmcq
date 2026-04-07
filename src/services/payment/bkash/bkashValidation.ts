import {
  createEmptyBkashSettings,
  type BkashEnvironmentMode,
  type BkashSettingsPayload,
  type BkashValidationIssue,
  type BkashValidationResult,
} from "@/types/payment/bkashTypes";

const isValidUrl = (value: string) => {
  if (!value) return false;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
};

const isLikelySandboxUrl = (value: string) => /sandbox|demo|test/i.test(value);
const isLikelyLiveUrl = (value: string) => !isLikelySandboxUrl(value);

const pushRequiredField = (issues: BkashValidationIssue[], field: string, label: string, value?: string | boolean | null) => {
  if (typeof value === "boolean") {
    if (!value) issues.push({ field, message: `${label} is required`, severity: "error" });
    return;
  }

  if (!value || !String(value).trim()) {
    issues.push({ field, message: `${label} is required`, severity: "error" });
  }
};

const validateModeMismatch = (
  issues: BkashValidationIssue[],
  field: string,
  label: string,
  value: string,
  mode: BkashEnvironmentMode,
) => {
  if (!value) return;
  if (mode === "sandbox" && isLikelyLiveUrl(value) && !isLikelySandboxUrl(value)) {
    issues.push({ field, message: `Sandbox mode is enabled but live URL detected in ${label}`, severity: "warning" });
  }
  if (mode === "live" && isLikelySandboxUrl(value)) {
    issues.push({ field, message: `Live mode is enabled but sandbox base URL is configured in ${label}`, severity: "warning" });
  }
};

export const validateBkashSettingsPayload = (payload: BkashSettingsPayload): BkashValidationResult => {
  const settings = { ...createEmptyBkashSettings(), ...payload };
  const issues: BkashValidationIssue[] = [];
  const mode = settings.general.mode;

  pushRequiredField(issues, "general.payment_title", "Payment title", settings.general.payment_title);
  pushRequiredField(issues, "general.currency", "Currency", settings.general.currency);

  const callbackFields = [
    ["callback_settings.callback_base_url", "Callback base URL", settings.callback_settings.callback_base_url],
    ["callback_settings.success_url", "Success callback URL", settings.callback_settings.success_url],
    ["callback_settings.failure_url", "Failure callback URL", settings.callback_settings.failure_url],
    ["callback_settings.cancel_url", "Cancel callback URL", settings.callback_settings.cancel_url],
    ["callback_settings.redirect_success_url", "Redirect after payment success", settings.callback_settings.redirect_success_url],
    ["callback_settings.redirect_failure_url", "Redirect after payment failure", settings.callback_settings.redirect_failure_url],
    ["callback_settings.redirect_cancel_url", "Redirect after payment cancel", settings.callback_settings.redirect_cancel_url],
  ] as const;

  callbackFields.forEach(([field, label, value]) => {
    if (value && !isValidUrl(value)) {
      issues.push({ field, message: `${label} is invalid`, severity: "error" });
    }
  });

  const standardFields = [
    ["credentials.standard.username", "Standard API Username", settings.credentials.standard.username],
    ["credentials.standard.password", "Standard API Password", settings.credentials.standard.password],
    ["credentials.standard.app_key", "Missing Standard API App Key", settings.credentials.standard.app_key],
    ["credentials.standard.app_secret", "Missing Standard API App Secret", settings.credentials.standard.app_secret],
    ["standard_endpoints.base_url", "Standard API Base URL", settings.standard_endpoints.base_url],
  ] as const;

  if (settings.general.is_enabled && !settings.general.enable_tokenized) {
    standardFields.forEach(([field, label, value]) => {
      if (!value || !String(value).trim()) {
        issues.push({
          field,
          message: label.startsWith("Missing") ? label : `${label} is required`,
          severity: "error",
        });
      }
    });
  }

  if (!settings.general.enable_tokenized && settings.standard_endpoints.base_url && !isValidUrl(settings.standard_endpoints.base_url)) {
    issues.push({ field: "standard_endpoints.base_url", message: "Standard API Base URL must be a valid URL", severity: "error" });
  }

  if (!settings.general.enable_tokenized) {
    validateModeMismatch(issues, "standard_endpoints.base_url", "Standard API Base URL", settings.standard_endpoints.base_url, mode);
  }

  if (settings.general.enable_tokenized) {
    const tokenizedFields = [
      ["credentials.tokenized.username", "Tokenized Username", settings.credentials.tokenized.username],
      ["credentials.tokenized.password", "Tokenized Password", settings.credentials.tokenized.password],
      ["credentials.tokenized.app_key", "Missing Tokenized App Key", settings.credentials.tokenized.app_key],
      ["credentials.tokenized.app_secret", "Missing Tokenized App Secret", settings.credentials.tokenized.app_secret],
      ["tokenized_endpoints.base_url", "Tokenized Base URL", settings.tokenized_endpoints.base_url],
    ] as const;

    tokenizedFields.forEach(([field, label, value]) => {
      if (!value || !String(value).trim()) {
        issues.push({
          field,
          message: label.startsWith("Missing") ? label : `${label} is required`,
          severity: "error",
        });
      }
    });
  }

  if (settings.tokenized_endpoints.base_url && !isValidUrl(settings.tokenized_endpoints.base_url)) {
    issues.push({ field: "tokenized_endpoints.base_url", message: "Tokenized Base URL must be a valid URL", severity: "error" });
  }

  validateModeMismatch(issues, "tokenized_endpoints.base_url", "Tokenized Base URL", settings.tokenized_endpoints.base_url, mode);

  if (settings.general.is_enabled && issues.every((issue) => issue.severity !== "error") === false) {
    issues.push({
      field: "general.is_enabled",
      message: "bKash is enabled but required credentials are incomplete",
      severity: "warning",
    });
  }

  if (settings.general.enable_tokenized) {
    const tokenizedSecretsReady = Boolean(
      settings.credentials.tokenized.username &&
      settings.credentials.tokenized.password &&
      settings.credentials.tokenized.app_key &&
      settings.credentials.tokenized.app_secret,
    );

    if (!tokenizedSecretsReady) {
      issues.push({
        field: "general.enable_tokenized",
        message: "Tokenized payment is enabled but tokenized secrets are missing",
        severity: "warning",
      });
    }
  }

  return {
    ok: !issues.some((issue) => issue.severity === "error"),
    mode,
    issues,
    checked_at: new Date().toISOString(),
  };
};
