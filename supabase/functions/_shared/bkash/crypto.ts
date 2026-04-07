const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toBase64 = (buffer: Uint8Array) => btoa(String.fromCharCode(...buffer));
const fromBase64 = (value: string) => Uint8Array.from(atob(value), (character) => character.charCodeAt(0));

const getKeyMaterial = async () => {
  const secret = Deno.env.get("BKASH_SETTINGS_ENCRYPTION_KEY");
  if (!secret) {
    throw new Error("BKASH_SETTINGS_ENCRYPTION_KEY is not configured");
  }

  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
};

export const encryptSecret = async (value: string) => {
  const clean = value.trim();
  if (!clean) return null;
  const key = await getKeyMaterial();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(clean));
  return `v1.${toBase64(iv)}.${toBase64(new Uint8Array(encrypted))}`;
};

export const decryptSecret = async (value: string | null) => {
  if (!value) return "";
  const [version, ivValue, cipherValue] = value.split(".");
  if (version !== "v1" || !ivValue || !cipherValue) {
    throw new Error("Invalid encrypted secret format");
  }

  const key = await getKeyMaterial();
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(ivValue) },
    key,
    fromBase64(cipherValue),
  );
  return decoder.decode(decrypted);
};

export const maskSecret = (value: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length <= 4) return "*".repeat(trimmed.length);
  return `${trimmed.slice(0, 2)}${"*".repeat(Math.max(4, trimmed.length - 4))}${trimmed.slice(-2)}`;
};

export const maskToken = (value: string | null) => {
  if (!value) return null;
  if (value.length <= 8) return `${value.slice(0, 2)}****`;
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
};
