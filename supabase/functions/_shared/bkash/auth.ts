import { createAnonClient, createServiceClient } from "./clients.ts";

const decodeJwtPayload = (jwt: string) => {
  try {
    const [, payload] = jwt.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(atob(padded)) as { sub?: string } | null;
  } catch {
    return null;
  }
};

export const requireAdmin = async (request: Request) => {
  const authorization = request.headers.get("Authorization");
  if (!authorization) {
    throw new Response(JSON.stringify({ error: "Missing authorization header" }), { status: 401 });
  }

  const jwt = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) {
    throw new Response(JSON.stringify({ error: "Missing bearer token" }), { status: 401 });
  }

  const anonClient = createAnonClient(`Bearer ${jwt}`);
  const {
    data: { user: anonUser },
    error: anonUserError,
  } = await anonClient.auth.getUser();

  const service = createServiceClient();
  const {
    data: { user: serviceUser },
    error: serviceUserError,
  } = await service.auth.getUser(jwt);

  const decoded = decodeJwtPayload(jwt);
  const fallbackUser = decoded?.sub ? { id: decoded.sub } : null;
  const user = anonUser || serviceUser || fallbackUser;
  const userError = anonUserError || serviceUserError;

  if (!user) {
    throw new Response(JSON.stringify({ error: "Invalid session" }), { status: 401 });
  }

  const { data: isAdmin, error: roleError } = await service.rpc("has_role", {
    _user_id: user.id,
    _role: "admin",
  });

  if (roleError || !isAdmin) {
    throw new Response(JSON.stringify({ error: "Admin access required" }), { status: 403 });
  }

  return { user, service };
};

export const requireUser = async (request: Request) => {
  const authorization = request.headers.get("Authorization");
  if (!authorization) {
    throw new Response(JSON.stringify({ error: "Missing authorization header" }), { status: 401 });
  }

  const jwt = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) {
    throw new Response(JSON.stringify({ error: "Missing bearer token" }), { status: 401 });
  }

  const anonClient = createAnonClient(`Bearer ${jwt}`);
  const {
    data: { user: anonUser },
    error: anonUserError,
  } = await anonClient.auth.getUser();

  const service = createServiceClient();
  const {
    data: { user: serviceUser },
    error: serviceUserError,
  } = await service.auth.getUser(jwt);

  const decoded = decodeJwtPayload(jwt);
  const fallbackUser = decoded?.sub ? { id: decoded.sub } : null;
  const user = anonUser || serviceUser || fallbackUser;
  const userError = anonUserError || serviceUserError;

  if (!user) {
    throw new Response(JSON.stringify({ error: "Invalid session" }), { status: 401 });
  }

  return { user, service };
};
