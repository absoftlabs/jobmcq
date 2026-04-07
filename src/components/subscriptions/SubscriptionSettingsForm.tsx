import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SubscriptionSettingsRow } from "@/lib/subscription-utils";

const settingsSchema = z.object({
  pricing_page_title: z.string().min(1),
  pricing_page_subtitle: z.string().min(1),
  currency_symbol: z.string().min(1),
  pricing_enabled: z.boolean(),
  show_discount_badge: z.boolean(),
  show_popular_ribbon: z.boolean(),
  show_comparison_table: z.boolean(),
  show_faq: z.boolean(),
  show_testimonials: z.boolean(),
  show_support_block: z.boolean(),
});

export type SubscriptionSettingsFormValues = z.infer<typeof settingsSchema>;

export function SubscriptionSettingsForm({
  initialValue,
  onSubmit,
  saving,
}: {
  initialValue: SubscriptionSettingsRow;
  onSubmit: (values: SubscriptionSettingsFormValues) => Promise<void>;
  saving?: boolean;
}) {
  const form = useForm<SubscriptionSettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    values: {
      pricing_page_title: initialValue.pricing_page_title,
      pricing_page_subtitle: initialValue.pricing_page_subtitle,
      currency_symbol: initialValue.currency_symbol,
      pricing_enabled: initialValue.pricing_enabled,
      show_discount_badge: initialValue.show_discount_badge,
      show_popular_ribbon: initialValue.show_popular_ribbon,
      show_comparison_table: initialValue.show_comparison_table,
      show_faq: initialValue.show_faq,
      show_testimonials: initialValue.show_testimonials,
      show_support_block: initialValue.show_support_block,
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardContent className="grid gap-4 p-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Pricing Page Title</Label>
            <Input {...form.register("pricing_page_title")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Pricing Page Subtitle</Label>
            <Input {...form.register("pricing_page_subtitle")} />
          </div>
          <div className="space-y-2">
            <Label>Currency Symbol</Label>
            <Input {...form.register("currency_symbol")} />
          </div>
          <div className="space-y-2">
            <Label>Display Settings</Label>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                ["pricing_enabled", "Pricing enabled"],
                ["show_discount_badge", "Show discount badge"],
                ["show_popular_ribbon", "Show popular ribbon"],
                ["show_comparison_table", "Show comparison table"],
                ["show_faq", "Show FAQ"],
                ["show_testimonials", "Show testimonials"],
                ["show_support_block", "Show support block"],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(form.watch(key as keyof SubscriptionSettingsFormValues))}
                    onChange={(event) => form.setValue(key as keyof SubscriptionSettingsFormValues, event.target.checked as never)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={saving}>
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </form>
  );
}
