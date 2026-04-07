export const parseBkashCallback = async (request: Request) => {
  const url = new URL(request.url);
  const contentType = request.headers.get("content-type") || "";
  let body: unknown = null;

  if (contentType.includes("application/json")) {
    body = await request.json().catch(() => null);
  }

  return {
    paymentID: url.searchParams.get("paymentID") || (body && typeof body === "object" ? String((body as Record<string, unknown>).paymentID ?? "") : ""),
    status: url.searchParams.get("status") || (body && typeof body === "object" ? String((body as Record<string, unknown>).status ?? "") : ""),
    trxID: url.searchParams.get("trxID") || (body && typeof body === "object" ? String((body as Record<string, unknown>).trxID ?? "") : ""),
    raw: body,
  };
};
