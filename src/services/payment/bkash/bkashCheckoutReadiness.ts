import { fetchBkashPublicConfig, isBkashAvailableForCheckout } from "@/services/payment/bkash/bkashConfigService";
import type { BkashPublicConfig } from "@/types/payment/bkashTypes";

export const getBkashCheckoutConfig = async (): Promise<BkashPublicConfig | null> => fetchBkashPublicConfig();

export const assertBkashAvailable = async () => {
  const available = await isBkashAvailableForCheckout();
  if (!available) {
    throw new Error("bKash is not available for checkout right now.");
  }
};

export const initializeBkashPaymentReadiness = async () => {
  const config = await getBkashCheckoutConfig();
  if (!config?.is_enabled) {
    return { available: false, reason: "bKash is disabled" as const };
  }

  if (!config.show_on_checkout) {
    return { available: false, reason: "bKash is hidden on checkout" as const };
  }

  return {
    available: true,
    reason: null,
    mode: config.environment_mode,
    title: config.payment_title,
    description: config.payment_description,
  };
};
