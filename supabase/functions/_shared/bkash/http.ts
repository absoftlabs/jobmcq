export const jsonHeaders = (headers?: Record<string, string>) => ({
  "Content-Type": "application/json",
  Accept: "application/json",
  ...headers,
});

export const postJson = async (url: string, body: unknown, headers?: Record<string, string>) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: jsonHeaders(headers),
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { raw: text };
    }

    return { response, data: parsed };
  } finally {
    clearTimeout(timeout);
  }
};

export const getJson = async (url: string, headers?: Record<string, string>) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: jsonHeaders(headers),
      signal: controller.signal,
    });

    const text = await response.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { raw: text };
    }

    return { response, data: parsed };
  } finally {
    clearTimeout(timeout);
  }
};
