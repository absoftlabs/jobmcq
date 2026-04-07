export type AccountStatus = "pending" | "active" | "suspended" | "deleted";

export function resolveAccountStatus(
  accountStatus: string | null | undefined,
  suspendedAt?: string | null,
  lastLoginAt?: string | null,
): AccountStatus {
  if (accountStatus === "deleted") return "deleted";
  if (accountStatus === "pending") return "pending";
  if (accountStatus === "suspended") return suspendedAt ? "suspended" : "pending";
  return lastLoginAt ? "active" : "pending";
}
