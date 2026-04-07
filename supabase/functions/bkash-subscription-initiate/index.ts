import { corsHeaders } from "../_shared/cors.ts";
import { requireUser } from "../_shared/bkash/auth.ts";
import { getResolvedCredentials, getBkashSettingsRow } from "../_shared/bkash/settings.ts";
import { getOrCreateBkashToken } from "../_shared/bkash/token-manager.ts";
import { postJson } from "../_shared/bkash/http.ts";
import { writeGatewayLog } from "../_shared/bkash/logger.ts";
import { getEffectivePriceForPackage } from "../_shared/bkash/subscription_utils.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user, service } = await requireUser(request);
    const { packageId, successUrl, failureUrl, cancelUrl } = await request.json();

    const settingsRow = await getBkashSettingsRow(service);
    if (!settingsRow.is_enabled) {
      return new Response(JSON.stringify({ error: "bKash gateway is disabled" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: pkg, error: packageError } = await service
      .from("subscription_packages")
      .select("*")
      .eq("id", packageId)
      .eq("active", true)
      .single();

    if (packageError || !pkg) {
      return new Response(JSON.stringify({ error: "Subscription package not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const amount = getEffectivePriceForPackage(pkg);
    const { data: order, error: orderError } = await service
      .from("subscription_orders")
      .insert({
        user_id: user.id,
        package_id: pkg.id,
        amount,
        currency: pkg.currency,
        payment_method: "bkash",
        payment_status: "pending",
        metadata: {
          package_slug: pkg.slug,
          success_url: successUrl || settingsRow.success_url || null,
          failure_url: failureUrl || settingsRow.failure_url || null,
          cancel_url: cancelUrl || settingsRow.cancel_url || null,
        },
      })
      .select("*")
      .single();

    if (orderError || !order) throw orderError;

    const token = await getOrCreateBkashToken({ service, row: settingsRow, tokenType: "tokenized" });
    const credentials = await getResolvedCredentials(settingsRow, "tokenized");

    const invoice = `SUB-${order.id.slice(0, 8).toUpperCase()}`;
    const supabaseOrigin = new URL(request.url).origin;
    const callbackUrl = `${supabaseOrigin}/functions/v1/bkash-subscription-complete?orderId=${order.id}`;

    const createUrl = `${String(settingsRow.tokenized_base_url ?? "")}${String(settingsRow.tokenized_create_endpoint ?? "")}`;
    const payload = {
      mode: "0011",
      payerReference: user.id,
      callbackURL: callbackUrl,
      amount: amount.toFixed(2),
      currency: pkg.currency || "BDT",
      intent: "sale",
      merchantInvoiceNumber: invoice,
      additionalMerchantInfo: {
        order_id: order.id,
        package_id: pkg.id,
        success_url: successUrl || settingsRow.success_url,
        failure_url: failureUrl || settingsRow.failure_url,
        cancel_url: cancelUrl || settingsRow.cancel_url,
      },
    };

    const { response, data } = await postJson(createUrl, payload, {
      authorization: token.accessToken,
      "x-app-key": credentials.app_key,
    });

    const parsed = data as Record<string, unknown> | null;
    const paymentId = String(parsed?.paymentID ?? "");
    const bkashUrl = String(parsed?.bkashURL ?? parsed?.paymentURL ?? "");
    const statusCode = String(parsed?.statusCode ?? "");
    const ok = response.ok && paymentId && bkashUrl && (!statusCode || statusCode === "0000");

    await service
      .from("subscription_orders")
      .update({
        metadata: {
          ...(order.metadata || {}),
          bkash_payment_id: paymentId || null,
          bkash_url: bkashUrl || null,
          merchant_invoice_number: invoice,
          create_response: parsed,
          success_url: successUrl || settingsRow.success_url || null,
          failure_url: failureUrl || settingsRow.failure_url || null,
          cancel_url: cancelUrl || settingsRow.cancel_url || null,
        },
      })
      .eq("id", order.id);

    await writeGatewayLog({
      service,
      logType: "subscription_payment_init",
      endpointName: "subscription_create_payment",
      requestPayload: payload,
      responsePayload: parsed,
      status: ok ? "success" : "error",
      httpStatus: response.status,
      message: String(parsed?.statusMessage ?? parsed?.message ?? response.statusText),
    });

    if (!ok) {
      return new Response(JSON.stringify({ error: String(parsed?.statusMessage ?? parsed?.message ?? "Failed to initialize bKash payment") }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      orderId: order.id,
      paymentId,
      redirectUrl: bkashUrl,
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
