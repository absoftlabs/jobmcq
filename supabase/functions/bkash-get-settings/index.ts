import { corsHeaders } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/bkash/auth.ts";
import { getBkashSettingsRow, toMaskedAdminResponse } from "../_shared/bkash/settings.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { service } = await requireAdmin(request);
    const row = await getBkashSettingsRow(service);
    const payload = await toMaskedAdminResponse(service, row);

    return new Response(JSON.stringify(payload), {
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
