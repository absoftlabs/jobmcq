import { getOrCreateBkashToken } from "./token-manager.ts";

export const testTokenizedConnection = async ({
  service,
  row,
}: {
  service: ReturnType<typeof import("./clients.ts").createServiceClient>;
  row: Record<string, unknown>;
}) => {
  const token = await getOrCreateBkashToken({ service, row, tokenType: "tokenized", forceRefresh: true });
  return {
    ok: true,
    status: "connected" as const,
    mode: Boolean(row.is_sandbox) ? "sandbox" as const : "live" as const,
    token_type: "tokenized" as const,
    status_code: 200,
    message: "Tokenized bKash token generated successfully",
    endpoint: `${String(row.tokenized_base_url ?? "")}${String(row.tokenized_grant_token_endpoint ?? "")}`,
    tested_at: new Date().toISOString(),
    token_status: {
      token_type: "tokenized" as const,
      token_exists: true,
      token_masked: token.tokenMasked ?? null,
      expires_at: token.expiresAt,
      last_refreshed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
};
