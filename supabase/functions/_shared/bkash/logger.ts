import type { LogStatus } from "./types.ts";

const redactKeys = new Set([
  "password",
  "app_secret",
  "app_key",
  "username",
  "refresh_token",
  "access_token",
  "id_token",
  "token",
  "authorization",
]);

export const sanitizePayload = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map((item) => sanitizePayload(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [
        key,
        redactKeys.has(key.toLowerCase()) ? "[REDACTED]" : sanitizePayload(entryValue),
      ]),
    );
  }
  return value;
};

export const writeGatewayLog = async ({
  service,
  logType,
  endpointName,
  requestPayload,
  responsePayload,
  status,
  httpStatus,
  message,
}: {
  service: ReturnType<typeof import("./clients.ts").createServiceClient>;
  logType: string;
  endpointName?: string;
  requestPayload?: unknown;
  responsePayload?: unknown;
  status: LogStatus;
  httpStatus?: number | null;
  message?: string;
}) => {
  await service.from("payment_gateway_logs").insert({
    provider_name: "bkash",
    log_type: logType,
    endpoint_name: endpointName || null,
    request_payload: sanitizePayload(requestPayload ?? {}),
    response_payload: sanitizePayload(responsePayload ?? {}),
    status,
    http_status: httpStatus ?? null,
    message: message || null,
  });
};
