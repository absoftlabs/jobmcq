import { corsHeaders } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/bkash/auth.ts";
import { getBkashSettingsRow } from "../_shared/bkash/settings.ts";
import { testTokenizedConnection } from "../_shared/bkash/tokenized-service.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { service } = await requireAdmin(request);
    const row = await getBkashSettingsRow(service);
    const result = await testTokenizedConnection({ service, row });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof Response) {
      return new Response(await error.text(), { status: error.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      ok: false,
      status: "failed",
      token_type: "tokenized",
      status_code: 500,
      message: error instanceof Error ? error.message : "Unknown error",
      tested_at: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
