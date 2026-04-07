import { getOrCreateBkashToken } from "./token-manager.ts";

export const testStandardConnection = async ({
  service,
  row,
}: {
  service: ReturnType<typeof import("./clients.ts").createServiceClient>;
  row: Record<string, unknown>;
}) => {
  const token = await getOrCreateBkashToken({ service, row, tokenType: "standard", forceRefresh: true });
  return {
    ok: true,
    status: "connected" as const,
    mode: Boolean(row.is_sandbox) ? "sandbox" as const : "live" as const,
    token_type: "standard" as const,
    status_code: 200,
    message: "Standard bKash token generated successfully",
    endpoint: `${String(row.standard_base_url ?? "")}${String(row.standard_grant_token_endpoint ?? "")}`,
    tested_at: new Date().toISOString(),
    token_status: {
      token_type: "standard" as const,
      token_exists: true,
      token_masked: token.tokenMasked ?? null,
      expires_at: token.expiresAt,
      last_refreshed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
};
