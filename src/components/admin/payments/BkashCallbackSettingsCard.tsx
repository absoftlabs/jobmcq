import type { UseFormReturn } from "react-hook-form";
import { Copy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GridField } from "@/components/admin/payments/BkashFieldHelpers";
import { toast } from "@/hooks/use-toast";
import type { BkashSettingsPayload } from "@/types/payment/bkashTypes";

const copyValue = async (value: string) => {
  if (!value) return;
  await navigator.clipboard.writeText(value);
  toast({ title: "ক্লিপবোর্ডে কপি হয়েছে" });
};

export function BkashCallbackSettingsCard({ form }: { form: UseFormReturn<BkashSettingsPayload> }) {
  const {
    register,
    watch,
    formState: { errors },
  } = form;

  return (
    <Card>
      <CardHeader>
        <CardTitle>কলব্যাক ইউআরএল</CardTitle>
        <CardDescription>API callback এবং payment-এর পর redirect URL এক জায়গা থেকে পরিচালনা করুন।</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <GridField label="কলব্যাক বেস ইউআরএল" error={errors.callback_settings?.callback_base_url?.message}>
          <div className="flex gap-2">
            <Input {...register("callback_settings.callback_base_url")} placeholder="https://your-domain.com/payments/bkash" />
            <Button type="button" variant="outline" size="icon" onClick={() => copyValue(watch("callback_settings.callback_base_url") || "")}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </GridField>
        <GridField label="সফল কলব্যাক ইউআরএল" error={errors.callback_settings?.success_url?.message}>
          <div className="flex gap-2">
            <Input {...register("callback_settings.success_url")} placeholder="https://your-domain.com/payments/bkash/success" />
            <Button type="button" variant="outline" size="icon" onClick={() => copyValue(watch("callback_settings.success_url") || "")}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </GridField>
        <GridField label="ব্যর্থ কলব্যাক ইউআরএল" error={errors.callback_settings?.failure_url?.message}>
          <div className="flex gap-2">
            <Input {...register("callback_settings.failure_url")} placeholder="https://your-domain.com/payments/bkash/failure" />
            <Button type="button" variant="outline" size="icon" onClick={() => copyValue(watch("callback_settings.failure_url") || "")}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </GridField>
        <GridField label="বাতিল কলব্যাক ইউআরএল" error={errors.callback_settings?.cancel_url?.message}>
          <div className="flex gap-2">
            <Input {...register("callback_settings.cancel_url")} placeholder="https://your-domain.com/payments/bkash/cancel" />
            <Button type="button" variant="outline" size="icon" onClick={() => copyValue(watch("callback_settings.cancel_url") || "")}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </GridField>
        <GridField label="সফল পেমেন্টের পর রিডাইরেক্ট" error={errors.callback_settings?.redirect_success_url?.message}>
          <div className="flex gap-2">
            <Input {...register("callback_settings.redirect_success_url")} placeholder="https://your-domain.com/checkout/success" />
            <Button type="button" variant="outline" size="icon" onClick={() => copyValue(watch("callback_settings.redirect_success_url") || "")}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </GridField>
        <GridField label="ব্যর্থ পেমেন্টের পর রিডাইরেক্ট" error={errors.callback_settings?.redirect_failure_url?.message}>
          <div className="flex gap-2">
            <Input {...register("callback_settings.redirect_failure_url")} placeholder="https://your-domain.com/checkout/failure" />
            <Button type="button" variant="outline" size="icon" onClick={() => copyValue(watch("callback_settings.redirect_failure_url") || "")}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </GridField>
        <GridField label="বাতিলের পর রিডাইরেক্ট" error={errors.callback_settings?.redirect_cancel_url?.message}>
          <div className="flex gap-2">
            <Input {...register("callback_settings.redirect_cancel_url")} placeholder="https://your-domain.com/checkout/cancel" />
            <Button type="button" variant="outline" size="icon" onClick={() => copyValue(watch("callback_settings.redirect_cancel_url") || "")}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </GridField>
      </CardContent>
    </Card>
  );
}
