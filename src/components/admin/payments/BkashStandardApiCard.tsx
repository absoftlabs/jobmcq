import { Controller, type UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { GridField } from "@/components/admin/payments/BkashFieldHelpers";
import { BkashSecretInput } from "@/components/admin/payments/BkashSecretInput";
import type { BkashMaskedCredentialSummary, BkashSettingsPayload } from "@/types/payment/bkashTypes";

export function BkashStandardApiCard({
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
        <CardTitle>Standard API</CardTitle>
        <CardDescription>Credentials and endpoint map for standard checkout API calls.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <GridField label="Username" error={errors.credentials?.standard?.username?.message}>
            <Input {...register("credentials.standard.username")} placeholder="sandbox_username" />
          </GridField>
          <GridField label="Password" error={errors.credentials?.standard?.password?.message}>
            <Controller
              control={control}
              name="credentials.standard.password"
              render={({ field }) => (
                <BkashSecretInput
                  {...field}
                  value={field.value || ""}
                  maskedValue={maskedSummary.standard_password}
                  placeholder="bKash password"
                />
              )}
            />
          </GridField>
          <GridField label="App Key" error={errors.credentials?.standard?.app_key?.message}>
            <Controller
              control={control}
              name="credentials.standard.app_key"
              render={({ field }) => (
                <BkashSecretInput
                  {...field}
                  value={field.value || ""}
                  maskedValue={maskedSummary.standard_app_key}
                  placeholder="bKash app key"
                />
              )}
            />
          </GridField>
          <GridField label="App Secret" error={errors.credentials?.standard?.app_secret?.message}>
            <Controller
              control={control}
              name="credentials.standard.app_secret"
              render={({ field }) => (
                <BkashSecretInput
                  {...field}
                  value={field.value || ""}
                  maskedValue={maskedSummary.standard_app_secret}
                  placeholder="bKash app secret"
                />
              )}
            />
          </GridField>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <GridField label="Base URL" error={errors.standard_endpoints?.base_url?.message}>
            <Input {...register("standard_endpoints.base_url")} placeholder="https://tokenized.sandbox.bka.sh/v1.2.0-beta" />
          </GridField>
          <GridField label="Grant Token Endpoint">
            <Input {...register("standard_endpoints.grant_token_endpoint")} placeholder="/tokenized/checkout/token/grant" />
          </GridField>
          <GridField label="Refresh Token Endpoint">
            <Input {...register("standard_endpoints.refresh_token_endpoint")} placeholder="/tokenized/checkout/token/refresh" />
          </GridField>
          <GridField label="Create Payment Endpoint">
            <Input {...register("standard_endpoints.create_payment_endpoint")} placeholder="/tokenized/checkout/create" />
          </GridField>
          <GridField label="Execute Payment Endpoint">
            <Input {...register("standard_endpoints.execute_payment_endpoint")} placeholder="/tokenized/checkout/execute" />
          </GridField>
          <GridField label="Query Payment Endpoint">
            <Input {...register("standard_endpoints.query_payment_endpoint")} placeholder="/tokenized/checkout/payment/status" />
          </GridField>
          <GridField label="Refund Endpoint">
            <Input {...register("standard_endpoints.refund_endpoint")} placeholder="/tokenized/checkout/payment/refund" />
          </GridField>
          <GridField label="Search Transaction Endpoint">
            <Input {...register("standard_endpoints.search_transaction_endpoint")} placeholder="/tokenized/checkout/general/searchTransaction" />
          </GridField>
        </div>
      </CardContent>
    </Card>
  );
}
