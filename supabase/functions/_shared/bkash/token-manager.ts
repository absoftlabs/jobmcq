import { decryptSecret, encryptSecret, maskToken } from "./crypto.ts";
import { postJson } from "./http.ts";
import { writeGatewayLog } from "./logger.ts";
import { getResolvedCredentials } from "./settings.ts";
import type { BkashTokenType, ConnectionStatus } from "./types.ts";

const buildTokenEndpoint = (row: Record<string, unknown>, tokenType: BkashTokenType, operation: "grant" | "refresh") => {
  if (tokenType === "standard") {
    const baseUrl = String(row.standard_base_url ?? "");
    const endpoint = operation === "grant"
      ? String(row.standard_grant_token_endpoint ?? "")
      : String(row.standard_refresh_token_endpoint ?? "");
    return `${baseUrl}${endpoint}`;
  }

  const baseUrl = String(row.tokenized_base_url ?? "");
  const endpoint = operation === "grant"
    ? String(row.tokenized_grant_token_endpoint ?? "")
    : String(row.tokenized_refresh_token_endpoint ?? "");
  return `${baseUrl}${endpoint}`;
};

const persistToken = async ({
  service,
  tokenType,
  accessToken,
  refreshToken,
  expiresInSeconds,
}: {
  service: ReturnType<typeof import("./clients.ts").createServiceClient>;
  tokenType: BkashTokenType;
  accessToken: string;
  refreshToken?: string | null;
  expiresInSeconds?: number;
}) => {
  const expiresAt = expiresInSeconds
    ? new Date(Date.now() + Math.max(60, expiresInSeconds - 60) * 1000).toISOString()
    : new Date(Date.now() + 50 * 60 * 1000).toISOString();

  await service.from("payment_gateway_tokens").upsert({
    provider_name: "bkash",
    token_type: tokenType,
    access_token_encrypted: await encryptSecret(accessToken),
    refresh_token_encrypted: refreshToken ? await encryptSecret(refreshToken) : null,
    token_masked: maskToken(accessToken),
    expires_at: expiresAt,
    last_refreshed_at: new Date().toISOString(),
  }, { onConflict: "provider_name,token_type" });
};

const getCachedToken = async (
  service: ReturnType<typeof import("./clients.ts").createServiceClient>,
  tokenType: BkashTokenType,
) => {
  const { data } = await service
    .from("payment_gateway_tokens")
    .select("*")
    .eq("provider_name", "bkash")
    .eq("token_type", tokenType)
    .maybeSingle();

  if (!data?.access_token_encrypted || !data.expires_at) return null;
  if (new Date(data.expires_at).getTime() <= Date.now() + 60_000) return null;

  return {
    accessToken: await decryptSecret(data.access_token_encrypted),
    refreshToken: data.refresh_token_encrypted ? await decryptSecret(data.refresh_token_encrypted) : null,
    expiresAt: data.expires_at,
    tokenMasked: data.token_masked,
  };
};

const updateConnectionStatus = async ({
  service,
  tokenType,
  status,
  message,
}: {
  service: ReturnType<typeof import("./clients.ts").createServiceClient>;
  tokenType: BkashTokenType;
  status: ConnectionStatus;
  message: string;
}) => {
  await service.from("payment_gateway_settings").update(
    tokenType === "standard"
      ? {
          last_standard_connection_status: status,
          last_standard_tested_at: new Date().toISOString(),
          last_standard_test_message: message,
        }
      : {
          last_tokenized_connection_status: status,
          last_tokenized_tested_at: new Date().toISOString(),
          last_tokenized_test_message: message,
        },
  ).eq("provider", "bkash");
};

export const getOrCreateBkashToken = async ({
  service,
  row,
  tokenType,
  forceRefresh = false,
}: {
  service: ReturnType<typeof import("./clients.ts").createServiceClient>;
  row: Record<string, unknown>;
  tokenType: BkashTokenType;
  forceRefresh?: boolean;
}) => {
  if (!forceRefresh) {
    const cached = await getCachedToken(service, tokenType);
    if (cached) return cached;
  }

  const credentials = await getResolvedCredentials(row, tokenType);
  const tokenUrl = buildTokenEndpoint(row, tokenType, "grant");
  const { response, data } = await postJson(
    tokenUrl,
    { app_key: credentials.app_key, app_secret: credentials.app_secret },
    { username: credentials.username, password: credentials.password },
  );

  const parsed = data as Record<string, unknown> | null;
  const accessToken = String(parsed?.id_token ?? parsed?.access_token ?? "");
  const refreshToken = parsed?.refresh_token ? String(parsed.refresh_token) : null;
  const expiresIn = Number(parsed?.expires_in ?? 3600);
  const statusCode = String(parsed?.statusCode ?? "");
  const ok = response.ok && accessToken.length > 0 && (!statusCode || statusCode === "0000");
  const message = String(parsed?.statusMessage ?? parsed?.message ?? response.statusText ?? "");

  await writeGatewayLog({
    service,
    logType: "token_grant",
    endpointName: tokenType === "standard" ? "grant_token" : "tokenized_grant_token",
    requestPayload: { tokenType, tokenUrl },
    responsePayload: parsed,
    status: ok ? "success" : "error",
    httpStatus: response.status,
    message,
  });

  await updateConnectionStatus({
    service,
    tokenType,
    status: ok ? "connected" : "failed",
    message: message || (ok ? "Connection successful" : "Connection failed"),
  });

  if (!ok) {
    throw new Error(message || "Failed to generate bKash access token");
  }

  await persistToken({
    service,
    tokenType,
    accessToken,
    refreshToken,
    expiresInSeconds: expiresIn,
  });

  return {
    accessToken,
    refreshToken,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    tokenMasked: maskToken(accessToken),
  };
};

export const clearBkashTokenCacheInternal = async (
  service: ReturnType<typeof import("./clients.ts").createServiceClient>,
) => {
  const { data } = await service
    .from("payment_gateway_tokens")
    .select("token_type")
    .eq("provider_name", "bkash");

  await service.from("payment_gateway_tokens").delete().eq("provider_name", "bkash");

  await writeGatewayLog({
    service,
    logType: "token_cache_clear",
    endpointName: "clear_token_cache",
    status: "info",
    requestPayload: {},
    responsePayload: { cleared_types: data?.map((item) => item.token_type) || [] },
    message: "bKash token cache cleared",
  });

  return (data?.map((item) => item.token_type) || []) as BkashTokenType[];
};
