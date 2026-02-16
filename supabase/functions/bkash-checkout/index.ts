import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type Json = Record<string, unknown>;

type BkashAction = "create" | "execute" | "query" | "search" | "refund";

interface BkashCreateBody {
  action: "create";
  courseId: string;
}

interface BkashExecuteBody {
  action: "execute";
  paymentID: string;
  status?: string;
}

interface BkashQueryBody {
  action: "query";
  paymentID: string;
}

interface BkashSearchBody {
  action: "search";
  trxID: string;
}

interface BkashRefundBody {
  action: "refund";
  paymentID: string;
  trxID: string;
  amount: string;
  sku?: string;
  reason?: string;
}

type BkashBody = BkashCreateBody | BkashExecuteBody | BkashQueryBody | BkashSearchBody | BkashRefundBody;

interface BkashRuntimeConfig {
  enabled: boolean;
  baseUrl: string;
  username: string;
  password: string;
  appKey: string;
  appSecret: string;
  callbackUrl: string;
  frontendBaseUrl: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const DEFAULT_BASE_URL = "https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const json = (status: number, body: Json) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const fail = (status: number, message: string, details?: unknown) => json(status, { error: message, details });

const resolveCallbackUrl = (cfg: BkashRuntimeConfig) => {
  if (cfg.callbackUrl) return cfg.callbackUrl;
  if (!cfg.frontendBaseUrl) return "";
  return `${cfg.frontendBaseUrl.replace(/\/$/, "")}/payment/bkash/callback`;
};

const getAuthUser = async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const jwt = authHeader.replace("Bearer ", "");
  if (!jwt) return null;
  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data.user) return null;
  return data.user;
};

const buildInvoice = (userId: string, courseId: string) =>
  `CRS-${courseId.slice(0, 6).toUpperCase()}-${userId.slice(0, 6).toUpperCase()}-${Date.now()}`;

const isBkashSuccess = (data: Json) => {
  const statusCode = String(data.statusCode || data.statuscode || "");
  const transactionStatus = String(data.transactionStatus || "");
  return statusCode === "0000" || transactionStatus.toLowerCase() === "completed";
};

const resolveConfigFromEnv = (): BkashRuntimeConfig => ({
  enabled: true,
  baseUrl: Deno.env.get("BKASH_BASE_URL") || DEFAULT_BASE_URL,
  username: Deno.env.get("BKASH_USERNAME") || "",
  password: Deno.env.get("BKASH_PASSWORD") || "",
  appKey: Deno.env.get("BKASH_APP_KEY") || "",
  appSecret: Deno.env.get("BKASH_APP_SECRET") || "",
  callbackUrl: Deno.env.get("BKASH_CALLBACK_URL") || "",
  frontendBaseUrl: Deno.env.get("FRONTEND_BASE_URL") || "",
});

const resolveBkashConfig = async (): Promise<BkashRuntimeConfig> => {
  const envCfg = resolveConfigFromEnv();

  const { data } = await supabase
    .from("payment_gateway_settings")
    .select("is_enabled, config")
    .eq("provider", "bkash")
    .maybeSingle();

  if (!data) return envCfg;

  const config = (data.config || {}) as Record<string, string>;
  return {
    enabled: data.is_enabled,
    baseUrl: config.base_url || envCfg.baseUrl,
    username: config.username || envCfg.username,
    password: config.password || envCfg.password,
    appKey: config.app_key || envCfg.appKey,
    appSecret: config.app_secret || envCfg.appSecret,
    callbackUrl: config.callback_url || envCfg.callbackUrl,
    frontendBaseUrl: config.frontend_base_url || envCfg.frontendBaseUrl,
  };
};

const validateConfig = (cfg: BkashRuntimeConfig) => {
  const missing = [
    ["BKASH_USERNAME", cfg.username],
    ["BKASH_PASSWORD", cfg.password],
    ["BKASH_APP_KEY", cfg.appKey],
    ["BKASH_APP_SECRET", cfg.appSecret],
  ].filter(([, value]) => !value).map(([key]) => key);

  return missing;
};

const grantToken = async (cfg: BkashRuntimeConfig) => {
  const response = await fetch(`${cfg.baseUrl}/token/grant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      username: cfg.username,
      password: cfg.password,
    },
    body: JSON.stringify({
      app_key: cfg.appKey,
      app_secret: cfg.appSecret,
    }),
  });

  const payload = (await response.json()) as Json;
  if (!response.ok) {
    throw new Error(`Grant token failed: ${JSON.stringify(payload)}`);
  }

  const idToken = String(payload.id_token || payload.idToken || "");
  const refreshToken = String(payload.refresh_token || payload.refreshToken || "");
  if (!idToken) {
    throw new Error(`Grant token response missing id_token: ${JSON.stringify(payload)}`);
  }
  return { idToken, refreshToken };
};

const refreshToken = async (cfg: BkashRuntimeConfig, token: string) => {
  const response = await fetch(`${cfg.baseUrl}/token/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      username: cfg.username,
      password: cfg.password,
    },
    body: JSON.stringify({
      app_key: cfg.appKey,
      app_secret: cfg.appSecret,
      refresh_token: token,
    }),
  });

  const payload = (await response.json()) as Json;
  if (!response.ok) {
    throw new Error(`Refresh token failed: ${JSON.stringify(payload)}`);
  }

  const idToken = String(payload.id_token || payload.idToken || "");
  if (!idToken) {
    throw new Error(`Refresh token response missing id_token: ${JSON.stringify(payload)}`);
  }
  return idToken;
};

const callBkashApi = async (
  cfg: BkashRuntimeConfig,
  endpoint: string,
  method: "GET" | "POST",
  idToken: string,
  payload?: Json,
) => {
  const response = await fetch(`${cfg.baseUrl}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: idToken,
      "X-APP-Key": cfg.appKey,
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });

  const data = (await response.json()) as Json;
  return { ok: response.ok, data, status: response.status };
};

const callBkashWithAutoRefresh = async (
  cfg: BkashRuntimeConfig,
  endpoint: string,
  method: "GET" | "POST",
  payload?: Json,
) => {
  const granted = await grantToken(cfg);
  let idToken = granted.idToken;

  let result = await callBkashApi(cfg, endpoint, method, idToken, payload);
  if (result.status === 401 && granted.refreshToken) {
    idToken = await refreshToken(cfg, granted.refreshToken);
    result = await callBkashApi(cfg, endpoint, method, idToken, payload);
  }
  return result;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return fail(500, "Missing Supabase service configuration");
  }

  const user = await getAuthUser(req);
  if (!user) return fail(401, "Unauthorized");

  let body: BkashBody;
  try {
    body = (await req.json()) as BkashBody;
  } catch {
    return fail(400, "Invalid JSON body");
  }

  const action = body.action as BkashAction;
  if (!action) return fail(400, "Action is required");

  const cfg = await resolveBkashConfig();
  if (!cfg.enabled && (action === "create" || action === "execute")) {
    return fail(400, "bKash gateway is disabled");
  }
  const missingConfig = validateConfig(cfg);
  if (missingConfig.length > 0) {
    return fail(500, "Missing bKash config values", { missing: missingConfig });
  }

  try {
    if (action === "create") {
      const { courseId } = body as BkashCreateBody;
      if (!courseId) return fail(400, "courseId is required");

      const [{ data: course }, { data: enrolled }] = await Promise.all([
        supabase
          .from("courses")
          .select("id, title, is_paid, price, currency, status")
          .eq("id", courseId)
          .maybeSingle(),
        supabase
          .from("course_enrollments")
          .select("id")
          .eq("course_id", courseId)
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (!course || course.status !== "published") {
        return fail(404, "Course not found or not published");
      }
      if (!course.is_paid) {
        return fail(400, "This is a free course. Use direct enrollment.");
      }
      if (enrolled) {
        return json(200, { alreadyEnrolled: true });
      }

      const callbackURL = resolveCallbackUrl(cfg);
      if (!callbackURL) {
        return fail(500, "Missing callback URL in gateway settings");
      }

      const merchantInvoiceNumber = buildInvoice(user.id, courseId);
      const createPayload = {
        mode: "0011",
        payerReference: user.id.slice(0, 20),
        callbackURL,
        amount: Number(course.price || 0).toFixed(2),
        currency: String(course.currency || "BDT"),
        intent: "sale",
        merchantInvoiceNumber,
      };

      const created = await callBkashWithAutoRefresh(cfg, "/payment/create", "POST", createPayload);
      if (!created.ok || !isBkashSuccess(created.data)) {
        return fail(502, "bKash create payment failed", created.data);
      }

      const paymentID = String(created.data.paymentID || "");
      const bkashURL = String(created.data.bkashURL || "");
      if (!paymentID || !bkashURL) {
        return fail(502, "bKash create payment response missing paymentID or bkashURL", created.data);
      }

      const { error: paymentError } = await supabase.from("course_payments").insert({
        user_id: user.id,
        course_id: courseId,
        provider: "bkash",
        amount: Number(course.price || 0),
        currency: String(course.currency || "BDT"),
        status: "pending",
        payment_id: paymentID,
        merchant_invoice: merchantInvoiceNumber,
        payment_reference: merchantInvoiceNumber,
        bkash_payment_status: String(created.data.transactionStatus || "Initiated"),
        metadata: created.data,
      });

      if (paymentError && !paymentError.message.toLowerCase().includes("duplicate")) {
        return fail(500, "Failed to store payment session", paymentError.message);
      }

      return json(200, { paymentID, bkashURL });
    }

    if (action === "execute") {
      const { paymentID, status } = body as BkashExecuteBody;
      if (!paymentID) return fail(400, "paymentID is required");

      const normalizedStatus = (status || "").toLowerCase();
      if (normalizedStatus && normalizedStatus !== "success") {
        await supabase
          .from("course_payments")
          .update({ status: normalizedStatus === "cancel" ? "cancelled" : "failed" })
          .eq("payment_id", paymentID)
          .eq("user_id", user.id);
        return json(200, { status: normalizedStatus });
      }

      const { data: existingPayment } = await supabase
        .from("course_payments")
        .select("id, course_id, status")
        .eq("payment_id", paymentID)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existingPayment) {
        return fail(404, "Payment session not found");
      }

      if (existingPayment.status === "completed") {
        return json(200, { status: "completed" });
      }

      let executed = await callBkashWithAutoRefresh(cfg, `/payment/execute/${encodeURIComponent(paymentID)}`, "POST");
      if (!executed.ok || !isBkashSuccess(executed.data)) {
        const queried = await callBkashWithAutoRefresh(cfg, `/payment/query/${encodeURIComponent(paymentID)}`, "POST");
        if (!queried.ok || !isBkashSuccess(queried.data)) {
          await supabase
            .from("course_payments")
            .update({
              status: "failed",
              bkash_payment_status: String(queried.data.transactionStatus || queried.data.statusMessage || "Failed"),
              metadata: queried.data,
            })
            .eq("id", existingPayment.id);
          return fail(502, "bKash execute payment failed", queried.data);
        }
        executed = queried;
      }

      const trxID = String(executed.data.trxID || "");
      const transactionStatus = String(executed.data.transactionStatus || "Completed");

      const { error: updateError } = await supabase
        .from("course_payments")
        .update({
          status: "completed",
          trx_id: trxID || null,
          paid_at: new Date().toISOString(),
          bkash_payment_status: transactionStatus,
          metadata: executed.data,
        })
        .eq("id", existingPayment.id);

      if (updateError) return fail(500, "Failed to update payment record", updateError.message);

      const { error: enrollError } = await supabase.from("course_enrollments").insert({
        user_id: user.id,
        course_id: existingPayment.course_id,
      });
      if (enrollError && !enrollError.message.toLowerCase().includes("duplicate")) {
        return fail(500, "Payment successful but enrollment failed", enrollError.message);
      }

      return json(200, { status: "completed", trxID, paymentID });
    }

    if (action === "query") {
      const { paymentID } = body as BkashQueryBody;
      if (!paymentID) return fail(400, "paymentID is required");
      const queried = await callBkashWithAutoRefresh(cfg, `/payment/query/${encodeURIComponent(paymentID)}`, "POST");
      if (!queried.ok) return fail(502, "bKash query failed", queried.data);
      return json(200, queried.data);
    }

    if (action === "search") {
      const { trxID } = body as BkashSearchBody;
      if (!trxID) return fail(400, "trxID is required");
      const searched = await callBkashWithAutoRefresh(cfg, "/payment/search", "POST", { trxID });
      if (!searched.ok) return fail(502, "bKash search failed", searched.data);
      return json(200, searched.data);
    }

    if (action === "refund") {
      const { paymentID, trxID, amount, sku, reason } = body as BkashRefundBody;
      if (!paymentID || !trxID || !amount) return fail(400, "paymentID, trxID and amount are required");
      const refunded = await callBkashWithAutoRefresh(cfg, "/payment/refund", "POST", {
        paymentID,
        trxID,
        amount,
        sku: sku || "course",
        reason: reason || "Course refund",
      });
      if (!refunded.ok) return fail(502, "bKash refund failed", refunded.data);
      return json(200, refunded.data);
    }

    return fail(400, "Unsupported action");
  } catch (error) {
    return fail(500, "Unexpected error in bKash checkout flow", String(error));
  }
});
