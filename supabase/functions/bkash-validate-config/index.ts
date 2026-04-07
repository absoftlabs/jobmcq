import { corsHeaders } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/bkash/auth.ts";
import { buildPayloadFromRow, getBkashSettingsRow } from "../_shared/bkash/settings.ts";
import { writeGatewayLog } from "../_shared/bkash/logger.ts";
import { validateBkashPayload } from "../_shared/bkash/validator.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { service } = await requireAdmin(request);
    const row = await getBkashSettingsRow(service);
    const payload = await buildPayloadFromRow(row);
    const validation = validateBkashPayload(payload);

    await writeGatewayLog({
      service,
      logType: "config_validation",
      endpointName: "validate_config",
      requestPayload: { mode: payload.general.mode },
      responsePayload: validation,
      status: validation.ok ? "success" : "warning",
      message: validation.ok ? "bKash configuration validated successfully" : "bKash configuration validation found issues",
    });

    return new Response(JSON.stringify(validation), {
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
