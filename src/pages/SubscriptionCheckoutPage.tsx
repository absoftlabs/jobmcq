import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SubscriptionCheckout } from "@/components/subscriptions/SubscriptionCheckout";
import { useSubscriptionPackage } from "@/hooks/use-subscriptions";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { initiateBkashSubscriptionPayment } from "@/services/payment/bkash/bkashConfigService";

export default function SubscriptionCheckoutPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const packageQuery = useSubscriptionPackage(slug);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate(`/auth?redirect=/pricing/checkout/${slug}`, { replace: true });
    }
  }, [navigate, slug, user]);

  if (!user) return null;

  if (packageQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!packageQuery.data) {
    return <div className="p-10 text-center text-muted-foreground">Package not found.</div>;
  }

  return (
    <div className="container py-10">
      <SubscriptionCheckout
        pkg={packageQuery.data}
        submitting={submitting}
        onSubmit={async () => {
          setSubmitting(true);
          try {
            const origin = window.location.origin;
            const result = await initiateBkashSubscriptionPayment({
              packageId: packageQuery.data.id,
              successUrl: `${origin}/student?payment=success`,
              failureUrl: `${origin}/pricing/checkout/${slug}?payment=failed`,
              cancelUrl: `${origin}/pricing/checkout/${slug}?payment=cancelled`,
            });
            window.location.href = result.redirectUrl;
          } catch (error) {
            toast({
              title: "Checkout failed",
              description: error instanceof Error ? error.message : "Unknown error",
              variant: "destructive",
            });
          } finally {
            setSubmitting(false);
          }
        }}
      />
    </div>
  );
}
