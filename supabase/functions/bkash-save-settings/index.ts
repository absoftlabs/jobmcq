import { corsHeaders } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/bkash/auth.ts";
import { writeGatewayLog } from "../_shared/bkash/logger.ts";
import { saveBkashSettingsRow, getBkashSettingsRow, toMaskedAdminResponse } from "../_shared/bkash/settings.ts";
import { validateBkashPayload } from "../_shared/bkash/validator.ts";
import type { BkashGatewaySettingsPayload } from "../_shared/bkash/types.ts";

const mergeStoredSecretsForValidation = (
  payload: BkashGatewaySettingsPayload,
  existing: Record<string, unknown>,
): BkashGatewaySettingsPayload => ({
  ...payload,
  credentials: {
    standard: {
      ...payload.credentials.standard,
      username: payload.credentials.standard.username || (existing.standard_username_encrypted ? "__stored__" : ""),
      password: payload.credentials.standard.password || (existing.standard_password_encrypted ? "__stored__" : ""),
      app_key: payload.credentials.standard.app_key || (existing.standard_app_key_encrypted ? "__stored__" : ""),
      app_secret: payload.credentials.standard.app_secret || (existing.standard_app_secret_encrypted ? "__stored__" : ""),
    },
    tokenized: {
      ...payload.credentials.tokenized,
      username: payload.credentials.tokenized.username || (existing.tokenized_username_encrypted ? "__stored__" : ""),
      password: payload.credentials.tokenized.password || (existing.tokenized_password_encrypted ? "__stored__" : ""),
      app_key: payload.credentials.tokenized.app_key || (existing.tokenized_app_key_encrypted ? "__stored__" : ""),
      app_secret: payload.credentials.tokenized.app_secret || (existing.tokenized_app_secret_encrypted ? "__stored__" : ""),
    },
  },
});

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user, service } = await requireAdmin(request);
    const payload = await request.json() as BkashGatewaySettingsPayload;
    const existing = await getBkashSettingsRow(service);
    const effectiveValidationPayload = mergeStoredSecretsForValidation(payload, existing);
    const validation = validateBkashPayload(effectiveValidationPayload);

    if (!validation.ok) {
      await writeGatewayLog({
        service,
        logType: "config_save",
        endpointName: "save_settings",
        requestPayload: payload,
        responsePayload: validation,
        status: "warning",
        message: "Attempted to save invalid bKash settings",
      });

      return new Response(JSON.stringify(validation), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await saveBkashSettingsRow({ service, payload, userId: user.id });
    const row = await getBkashSettingsRow(service);
    const response = await toMaskedAdminResponse(service, row);

    await writeGatewayLog({
      service,
      logType: "config_save",
      endpointName: "save_settings",
      requestPayload: payload,
      responsePayload: { ok: true },
      status: "success",
      message: "bKash settings saved successfully",
    });

    return new Response(JSON.stringify(response), {
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
