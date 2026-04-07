import { useQuery } from "@tanstack/react-query";
import {
  fetchBkashAdminSettings,
  fetchBkashLogs,
  fetchBkashPublicConfig,
  fetchBkashTokenStatuses,
} from "@/services/payment/bkash/bkashConfigService";

export const bkashQueryKeys = {
  admin: ["bkash", "admin-settings"] as const,
  public: ["bkash", "public-config"] as const,
  tokenStatuses: ["bkash", "token-statuses"] as const,
  logs: (limit = 20) => ["bkash", "logs", limit] as const,
};

export const useBkashAdminSettings = (enabled = true) =>
  useQuery({
    queryKey: bkashQueryKeys.admin,
    queryFn: fetchBkashAdminSettings,
    enabled,
  });

export const useBkashPublicConfig = () =>
  useQuery({
    queryKey: bkashQueryKeys.public,
    queryFn: fetchBkashPublicConfig,
  });

export const useBkashTokenStatuses = () =>
  useQuery({
    queryKey: bkashQueryKeys.tokenStatuses,
    queryFn: fetchBkashTokenStatuses,
  });

export const useBkashLogs = (limit = 20, enabled = true) =>
  useQuery({
    queryKey: bkashQueryKeys.logs(limit),
    queryFn: () => fetchBkashLogs(limit),
    enabled,
  });
