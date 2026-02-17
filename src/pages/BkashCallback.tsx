import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function BkashCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"completed" | "failed" | "cancelled" | "unknown">("unknown");

  const paymentID = useMemo(() => params.get("paymentID") || "", [params]);
  const callbackStatus = useMemo(() => (params.get("status") || "").toLowerCase(), [params]);

  useEffect(() => {
    const run = async () => {
      if (!paymentID) {
        setStatus("failed");
        setLoading(false);
        return;
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/bkash-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          action: "execute",
          paymentID,
          status: callbackStatus || "success",
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const readable = typeof data?.details === "string"
          ? data.details
          : (data?.error || data?.message || "Payment verify failed");
        setStatus("failed");
        toast({ title: "পেমেন্ট ভেরিফিকেশন ব্যর্থ", description: readable, variant: "destructive" });
        setLoading(false);
        return;
      }

      const resultStatus = String(data?.status || "").toLowerCase();
      if (resultStatus === "completed") {
        setStatus("completed");
        toast({ title: "পেমেন্ট সফল, এনরোল সম্পন্ন" });
      } else if (resultStatus === "cancel" || resultStatus === "cancelled") {
        setStatus("cancelled");
      } else if (resultStatus === "failure" || resultStatus === "failed") {
        setStatus("failed");
      } else {
        setStatus("unknown");
      }

      setLoading(false);
    };

    void run();
  }, [paymentID, callbackStatus, toast]);

  useEffect(() => {
    if (status === "completed") {
      const timer = setTimeout(() => {
        navigate("/student/courses");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [status, navigate]);

  return (
    <div className="container py-12">
      <Card>
        <CardHeader>
          <CardTitle>bKash Payment</CardTitle>
          <CardDescription>পেমেন্ট ভেরিফিকেশন চলছে...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              প্রসেস হচ্ছে...
            </div>
          ) : status === "completed" ? (
            <p className="text-sm text-green-600">পেমেন্ট সফল হয়েছে। আপনাকে কোর্স লার্নিং পেজে নেয়া হচ্ছে...</p>
          ) : status === "cancelled" ? (
            <p className="text-sm text-amber-600">পেমেন্ট বাতিল হয়েছে।</p>
          ) : (
            <p className="text-sm text-destructive">পেমেন্ট সম্পন্ন হয়নি। আবার চেষ্টা করুন।</p>
          )}

          <div className="flex gap-2">
            <Link to="/">
              <Button variant="outline">হোমে যান</Button>
            </Link>
            <Link to="/student/courses">
              <Button>আমার কোর্স</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
