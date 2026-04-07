import { corsHeaders } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/bkash/clients.ts";
import { getBkashSettingsRow, getResolvedCredentials } from "../_shared/bkash/settings.ts";
import { getOrCreateBkashToken } from "../_shared/bkash/token-manager.ts";
import { postJson } from "../_shared/bkash/http.ts";
import { writeGatewayLog } from "../_shared/bkash/logger.ts";
import { activateSubscriptionFromOrder } from "../_shared/bkash/subscription.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const service = createServiceClient();

  try {
    const url = new URL(request.url);
    const ensureAbsoluteRedirect = (value: string | null | undefined, fallback: string) => {
      if (!value) return fallback;
      try {
        return new URL(value).toString();
      } catch {
        return fallback;
      }
    };
    const payload = request.method === "POST" ? await request.json().catch(() => ({})) : {};
    const paymentId = String((payload as Record<string, unknown>).paymentID ?? url.searchParams.get("paymentID") ?? "");
    const status = String((payload as Record<string, unknown>).status ?? url.searchParams.get("status") ?? "");
    const orderId = String((payload as Record<string, unknown>).orderId ?? url.searchParams.get("orderId") ?? "");

    const { data: order, error: orderError } = await service
      .from("subscription_orders")
      .select("*, subscription_packages(*)")
      .eq("id", orderId)
      .single();

    if (orderError || !order) throw orderError;

    const settingsRow = await getBkashSettingsRow(service);
    const appBaseUrl = String(settingsRow.callback_base_url ?? "").replace(/\/$/, "");
    const successRedirect = ensureAbsoluteRedirect(
      String(order.metadata?.success_url ?? settingsRow.success_url ?? ""),
      `${appBaseUrl}/student`,
    );
    const failureRedirect = ensureAbsoluteRedirect(
      String(order.metadata?.failure_url ?? settingsRow.failure_url ?? ""),
      `${appBaseUrl}/pricing`,
    );
    const cancelRedirect = ensureAbsoluteRedirect(
      String(order.metadata?.cancel_url ?? settingsRow.cancel_url ?? ""),
      `${appBaseUrl}/pricing`,
    );

    if (status.toLowerCase() === "cancel" || status.toLowerCase() === "cancelled") {
      await service.from("subscription_orders").update({ payment_status: "cancelled" }).eq("id", orderId);
      return Response.redirect(cancelRedirect, 302);
    }

    if (status.toLowerCase() && !["success", "successful", "completed"].includes(status.toLowerCase())) {
      await service.from("subscription_orders").update({ payment_status: "failed" }).eq("id", orderId);
      return Response.redirect(failureRedirect, 302);
    }

    const token = await getOrCreateBkashToken({ service, row: settingsRow, tokenType: "tokenized" });
    const credentials = await getResolvedCredentials(settingsRow, "tokenized");
    const executeUrl = `${String(settingsRow.tokenized_base_url ?? "")}${String(settingsRow.tokenized_execute_endpoint ?? "")}`;

    const { response, data } = await postJson(executeUrl, { paymentID: paymentId }, {
      authorization: token.accessToken,
      "x-app-key": credentials.app_key,
    });

    const parsed = data as Record<string, unknown> | null;
    const statusCode = String(parsed?.statusCode ?? "");
    const ok = response.ok && (!statusCode || statusCode === "0000");
    const trxId = String(parsed?.trxID ?? "");

    await writeGatewayLog({
      service,
      logType: "subscription_payment_execute",
      endpointName: "subscription_execute_payment",
      requestPayload: { paymentID: paymentId, orderId },
      responsePayload: parsed,
      status: ok ? "success" : "error",
      httpStatus: response.status,
      message: String(parsed?.statusMessage ?? parsed?.message ?? response.statusText),
    });

    if (!ok) {
      await service
        .from("subscription_orders")
        .update({
          payment_status: "failed",
          metadata: {
            ...(order.metadata || {}),
            execute_response: parsed,
          },
        })
        .eq("id", orderId);
      return Response.redirect(failureRedirect, 302);
    }

    await service
      .from("subscription_orders")
      .update({
        payment_status: "paid",
        transaction_id: trxId || null,
        metadata: {
          ...(order.metadata || {}),
          execute_response: parsed,
          bkash_payment_id: paymentId,
        },
      })
      .eq("id", orderId);

    await activateSubscriptionFromOrder({
      service,
      userId: order.user_id,
      pkg: {
        id: order.package_id,
        name: order.subscription_packages.name,
        currency: order.currency,
        duration_type: order.subscription_packages.duration_type,
        duration_value: order.subscription_packages.duration_value,
        is_lifetime: order.subscription_packages.is_lifetime,
      },
      order,
      paymentReference: trxId || paymentId || null,
    });

    return Response.redirect(successRedirect, 302);
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
