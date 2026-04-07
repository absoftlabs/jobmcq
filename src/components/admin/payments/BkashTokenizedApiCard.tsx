import { Controller, type UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { GridField } from "@/components/admin/payments/BkashFieldHelpers";
import { BkashSecretInput } from "@/components/admin/payments/BkashSecretInput";
import type { BkashMaskedCredentialSummary, BkashSettingsPayload } from "@/types/payment/bkashTypes";

export function BkashTokenizedApiCard({
  form,
  maskedSummary,
}: {
  form: UseFormReturn<BkashSettingsPayload>;
  maskedSummary: BkashMaskedCredentialSummary;
}) {
  const {
    control,
    register,
    formState: { errors },
  } = form;

  return (
    <Card>
      <CardHeader>
        <CardTitle>টোকেনাইজড এপিআই</CardTitle>
        <CardDescription>agreement এবং tokenized recurring payment-এর কনফিগারেশন এখানে দিন।</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <GridField label="টোকেনাইজড ইউজারনেম" error={errors.credentials?.tokenized?.username?.message}>
            <Input {...register("credentials.tokenized.username")} placeholder="tokenized_username" />
          </GridField>
          <GridField label="টোকেনাইজড পাসওয়ার্ড" error={errors.credentials?.tokenized?.password?.message}>
            <Controller
              control={control}
              name="credentials.tokenized.password"
              render={({ field }) => (
                <BkashSecretInput
                  {...field}
                  value={field.value || ""}
                  maskedValue={maskedSummary.tokenized_password}
                  placeholder="টোকেনাইজড পাসওয়ার্ড"
                />
              )}
            />
          </GridField>
          <GridField label="টোকেনাইজড অ্যাপ কি" error={errors.credentials?.tokenized?.app_key?.message}>
            <Controller
              control={control}
              name="credentials.tokenized.app_key"
              render={({ field }) => (
                <BkashSecretInput
                  {...field}
                  value={field.value || ""}
                  maskedValue={maskedSummary.tokenized_app_key}
                  placeholder="টোকেনাইজড অ্যাপ কি"
                />
              )}
            />
          </GridField>
          <GridField label="টোকেনাইজড অ্যাপ সিক্রেট" error={errors.credentials?.tokenized?.app_secret?.message}>
            <Controller
              control={control}
              name="credentials.tokenized.app_secret"
              render={({ field }) => (
                <BkashSecretInput
                  {...field}
                  value={field.value || ""}
                  maskedValue={maskedSummary.tokenized_app_secret}
                  placeholder="টোকেনাইজড অ্যাপ সিক্রেট"
                />
              )}
            />
          </GridField>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <GridField label="টোকেনাইজড বেস ইউআরএল" error={errors.tokenized_endpoints?.base_url?.message}>
            <Input {...register("tokenized_endpoints.base_url")} placeholder="https://tokenized.sandbox.bka.sh/v1.2.0-beta" />
          </GridField>
          <GridField label="Grant Token Endpoint">
            <Input {...register("tokenized_endpoints.grant_token_endpoint")} />
          </GridField>
          <GridField label="Refresh Token Endpoint">
            <Input {...register("tokenized_endpoints.refresh_token_endpoint")} />
          </GridField>
          <GridField label="Create Endpoint">
            <Input {...register("tokenized_endpoints.create_payment_endpoint")} />
          </GridField>
          <GridField label="Execute Endpoint">
            <Input {...register("tokenized_endpoints.execute_payment_endpoint")} />
          </GridField>
          <GridField label="Agreement Status Endpoint">
            <Input {...register("tokenized_endpoints.agreement_status_endpoint")} />
          </GridField>
          <GridField label="Cancel Agreement Endpoint">
            <Input {...register("tokenized_endpoints.cancel_agreement_endpoint")} />
          </GridField>
          <GridField label="Payment Status Endpoint">
            <Input {...register("tokenized_endpoints.payment_status_endpoint")} />
          </GridField>
          <GridField label="Confirm Endpoint">
            <Input {...register("tokenized_endpoints.confirm_endpoint")} />
          </GridField>
          <GridField label="Refund Endpoint">
            <Input {...register("tokenized_endpoints.refund_endpoint")} />
          </GridField>
          <GridField label="Search Transaction Endpoint">
            <Input {...register("tokenized_endpoints.search_transaction_endpoint")} />
          </GridField>
        </div>
      </CardContent>
    </Card>
  );
}
