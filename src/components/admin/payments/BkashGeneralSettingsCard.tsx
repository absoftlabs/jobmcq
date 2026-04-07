import type { UseFormReturn } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { GridField } from "@/components/admin/payments/BkashFieldHelpers";
import type { BkashConnectionStatus, BkashSettingsPayload } from "@/types/payment/bkashTypes";

export function BkashGeneralSettingsCard({
  form,
  tokenizedStatus,
}: {
  form: UseFormReturn<BkashSettingsPayload>;
  tokenizedStatus: BkashConnectionStatus;
}) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const mode = watch("general.mode");
  const enableTokenized = watch("general.enable_tokenized");

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background via-background to-primary/5">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle>সাধারণ সেটিংস</CardTitle>
          <Badge variant={mode === "sandbox" ? "secondary" : "default"}>
            {mode === "sandbox" ? "স্যান্ডবক্স" : "লাইভ"}
          </Badge>
          <Badge variant={tokenizedStatus === "connected" ? "default" : tokenizedStatus === "failed" ? "destructive" : "outline"}>
            টোকেনাইজড: {tokenizedStatus === "connected" ? "সংযুক্ত" : tokenizedStatus === "failed" ? "ব্যর্থ" : "পরীক্ষা হয়নি"}
          </Badge>
        </div>
        <CardDescription>bKash environment এবং tokenized checkout-এর মূল সেটিংস এখানে ঠিক করুন।</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <GridField label="পেমেন্ট শিরোনাম" error={errors.general?.payment_title?.message}>
            <Input {...register("general.payment_title")} placeholder="বিকাশে পেমেন্ট করুন" />
          </GridField>
          <GridField label="কারেন্সি" error={errors.general?.currency?.message} hint="বাংলাদেশি পেমেন্টের জন্য এটি BDT রাখুন।">
            <Input {...register("general.currency")} placeholder="BDT" />
          </GridField>
        </div>

        <GridField label="পেমেন্ট বর্ণনা" error={errors.general?.payment_description?.message}>
          <Textarea
            {...register("general.payment_description")}
            placeholder="বিকাশ চেকআউটের মাধ্যমে নিরাপদে পেমেন্ট করুন।"
            className="min-h-24"
          />
        </GridField>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="flex items-center justify-between rounded-2xl border bg-muted/30 p-4">
            <div>
              <p className="text-sm font-medium">bKash চালু করুন</p>
              <p className="text-xs text-muted-foreground">চেকআউটে বিকাশ ব্যবহার করার অনুমতি দিন</p>
            </div>
            <Switch checked={watch("general.is_enabled")} onCheckedChange={(checked) => setValue("general.is_enabled", checked)} />
          </label>
          <label className="flex items-center justify-between rounded-2xl border bg-muted/30 p-4">
            <div>
              <p className="text-sm font-medium">স্যান্ডবক্স মোড</p>
              <p className="text-xs text-muted-foreground">লাইভ বিকাশ credential ব্যবহার করতে এটি বন্ধ করুন</p>
            </div>
            <Switch
              checked={mode === "sandbox"}
              onCheckedChange={(checked) => setValue("general.mode", checked ? "sandbox" : "live")}
            />
          </label>
          <label className="flex items-center justify-between rounded-2xl border bg-muted/30 p-4">
            <div>
              <p className="text-sm font-medium">টোকেনাইজড চালু করুন</p>
              <p className="text-xs text-muted-foreground">saved/agreement flow-এর জন্য প্রস্তুত রাখুন</p>
            </div>
            <Switch checked={enableTokenized} onCheckedChange={(checked) => setValue("general.enable_tokenized", checked)} />
          </label>
        </div>

      </CardContent>
    </Card>
  );
}
