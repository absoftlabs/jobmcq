import { corsHeaders } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/bkash/auth.ts";
import { clearBkashTokenCacheInternal } from "../_shared/bkash/token-manager.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { service } = await requireAdmin(request);
    const clearedTypes = await clearBkashTokenCacheInternal(service);

    return new Response(JSON.stringify({
      ok: true,
      cleared_types: clearedTypes,
      message: "bKash token cache cleared successfully",
      cleared_at: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof Response) {
      return new Response(await error.text(), { status: error.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
