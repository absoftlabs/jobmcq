import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PricingCard } from "@/components/subscriptions/PricingCard";
import { FeatureRepeater, type EditableFeatureItem } from "@/components/subscriptions/FeatureRepeater";
import type { SubscriptionPackageWithFeatures } from "@/lib/subscription-utils";
import { slugifyText } from "@/lib/subscription-utils";

const packageSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  slug: z.string().min(1),
  short_description: z.string().optional(),
  full_description: z.string().optional(),
  regular_price: z.coerce.number().min(0),
  sale_price: z.union([z.coerce.number().min(0), z.nan()]).optional(),
  currency: z.string().default("BDT"),
  billing_type: z.enum(["one_time", "recurring"]),
  duration_type: z.enum(["days", "months", "years", "lifetime"]),
  duration_value: z.union([z.coerce.number().int().positive(), z.nan()]).optional(),
  badge_text: z.string().optional(),
  badge_color: z.string().optional(),
  button_text: z.string().default("Subscribe"),
  button_url: z.string().optional(),
  accent_color: z.string().optional(),
  is_popular: z.boolean(),
  is_highlighted: z.boolean(),
  show_on_pricing_page: z.boolean(),
  show_on_homepage: z.boolean(),
  available_for_guests: z.boolean(),
  available_for_logged_in: z.boolean(),
  active: z.boolean(),
  sort_order: z.coerce.number().int().default(0),
  trial_enabled: z.boolean(),
  trial_days: z.union([z.coerce.number().int().min(0), z.nan()]).optional(),
  renewal_allowed: z.boolean(),
  limit_purchase_per_user: z.union([z.coerce.number().int().min(1), z.nan()]).optional(),
  allow_upgrade: z.boolean(),
  allow_downgrade: z.boolean(),
});

export type PackageFormData = z.infer<typeof packageSchema>;

const toFeatureItems = (pkg?: SubscriptionPackageWithFeatures | null): EditableFeatureItem[] =>
  pkg?.features.map((feature) => ({
    id: feature.id,
    feature_key: feature.feature_key,
    feature_label: feature.feature_label,
    feature_value: feature.feature_value || "",
    feature_type: feature.feature_type,
    icon_type: feature.icon_type,
    is_highlighted: feature.is_highlighted,
    is_active: feature.is_active,
  })) || [];

export function PackageForm({
  initialValue,
  onSubmit,
  saving,
}: {
  initialValue?: SubscriptionPackageWithFeatures | null;
  onSubmit: (values: { package: PackageFormData; features: EditableFeatureItem[] }) => Promise<void>;
  saving?: boolean;
}) {
  const [features, setFeatures] = useState<EditableFeatureItem[]>(toFeatureItems(initialValue));

  const form = useForm<PackageFormData>({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      id: initialValue?.id,
      name: initialValue?.name || "",
      slug: initialValue?.slug || "",
      short_description: initialValue?.short_description || "",
      full_description: initialValue?.full_description || "",
      regular_price: Number(initialValue?.regular_price || 0),
      sale_price: initialValue?.sale_price ? Number(initialValue.sale_price) : undefined,
      currency: initialValue?.currency || "BDT",
      billing_type: initialValue?.billing_type || "one_time",
      duration_type: initialValue?.duration_type || "months",
      duration_value: initialValue?.duration_value || undefined,
      badge_text: initialValue?.badge_text || "",
      badge_color: initialValue?.badge_color || "",
      button_text: initialValue?.button_text || "Subscribe",
      button_url: initialValue?.button_url || "",
      accent_color: initialValue?.accent_color || "",
      is_popular: initialValue?.is_popular || false,
      is_highlighted: initialValue?.is_highlighted || false,
      show_on_pricing_page: initialValue?.show_on_pricing_page ?? true,
      show_on_homepage: initialValue?.show_on_homepage ?? false,
      available_for_guests: initialValue?.available_for_guests ?? true,
      available_for_logged_in: initialValue?.available_for_logged_in ?? true,
      active: initialValue?.active ?? true,
      sort_order: initialValue?.sort_order || 0,
      trial_enabled: initialValue?.trial_enabled || false,
      trial_days: initialValue?.trial_days || undefined,
      renewal_allowed: initialValue?.renewal_allowed ?? true,
      limit_purchase_per_user: initialValue?.limit_purchase_per_user || undefined,
      allow_upgrade: initialValue?.allow_upgrade ?? true,
      allow_downgrade: initialValue?.allow_downgrade ?? true,
    },
  });

  const watchedName = form.watch("name");
  const watched = form.watch();

  useEffect(() => {
    form.reset({
      id: initialValue?.id,
      name: initialValue?.name || "",
      slug: initialValue?.slug || "",
      short_description: initialValue?.short_description || "",
      full_description: initialValue?.full_description || "",
      regular_price: Number(initialValue?.regular_price || 0),
      sale_price: initialValue?.sale_price ? Number(initialValue.sale_price) : undefined,
      currency: initialValue?.currency || "BDT",
      billing_type: initialValue?.billing_type || "one_time",
      duration_type: initialValue?.duration_type || "months",
      duration_value: initialValue?.duration_value || undefined,
      badge_text: initialValue?.badge_text || "",
      badge_color: initialValue?.badge_color || "",
      button_text: initialValue?.button_text || "Subscribe",
      button_url: initialValue?.button_url || "",
      accent_color: initialValue?.accent_color || "",
      is_popular: initialValue?.is_popular || false,
      is_highlighted: initialValue?.is_highlighted || false,
      show_on_pricing_page: initialValue?.show_on_pricing_page ?? true,
      show_on_homepage: initialValue?.show_on_homepage ?? false,
      available_for_guests: initialValue?.available_for_guests ?? true,
      available_for_logged_in: initialValue?.available_for_logged_in ?? true,
      active: initialValue?.active ?? true,
      sort_order: initialValue?.sort_order || 0,
      trial_enabled: initialValue?.trial_enabled || false,
      trial_days: initialValue?.trial_days || undefined,
      renewal_allowed: initialValue?.renewal_allowed ?? true,
      limit_purchase_per_user: initialValue?.limit_purchase_per_user || undefined,
      allow_upgrade: initialValue?.allow_upgrade ?? true,
      allow_downgrade: initialValue?.allow_downgrade ?? true,
    });
    setFeatures(toFeatureItems(initialValue));
  }, [form, initialValue]);

  useEffect(() => {
    if (!initialValue?.id) {
      form.setValue("slug", slugifyText(watchedName || ""));
    }
  }, [form, initialValue?.id, watchedName]);

  const previewPackage = useMemo(
    () =>
      ({
        id: watched.id || "preview",
        name: watched.name || "Package Name",
        slug: watched.slug || "package-name",
        short_description: watched.short_description || "",
        full_description: watched.full_description || "",
        regular_price: Number(watched.regular_price || 0),
        sale_price: watched.sale_price ? Number(watched.sale_price) : null,
        currency: watched.currency || "BDT",
        billing_type: watched.billing_type || "one_time",
        duration_type: watched.duration_type || "months",
        duration_value: watched.duration_value ? Number(watched.duration_value) : null,
        is_lifetime: watched.duration_type === "lifetime",
        badge_text: watched.badge_text || null,
        badge_color: watched.badge_color || null,
        button_text: watched.button_text || "Subscribe",
        button_url: watched.button_url || null,
        accent_color: watched.accent_color || null,
        is_popular: watched.is_popular || false,
        is_highlighted: watched.is_highlighted || false,
        show_on_pricing_page: watched.show_on_pricing_page ?? true,
        show_on_homepage: watched.show_on_homepage ?? false,
        available_for_guests: watched.available_for_guests ?? true,
        available_for_logged_in: watched.available_for_logged_in ?? true,
        active: watched.active ?? true,
        visibility: "public",
        sort_order: Number(watched.sort_order || 0),
        trial_enabled: watched.trial_enabled || false,
        trial_days: watched.trial_days ? Number(watched.trial_days) : null,
        renewal_allowed: watched.renewal_allowed ?? true,
        limit_purchase_per_user: watched.limit_purchase_per_user ? Number(watched.limit_purchase_per_user) : null,
        allow_upgrade: watched.allow_upgrade ?? true,
        allow_downgrade: watched.allow_downgrade ?? true,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        features: features.map((feature, index) => ({
          id: feature.id || `preview-${index}`,
          package_id: watched.id || "preview",
          feature_key: feature.feature_key,
          feature_label: feature.feature_label,
          feature_value: feature.feature_value,
          feature_type: feature.feature_type,
          icon_type: feature.icon_type,
          is_highlighted: feature.is_highlighted,
          sort_order: index + 1,
          is_active: feature.is_active,
          created_at: new Date().toISOString(),
        })),
      }) as SubscriptionPackageWithFeatures,
    [features, watched],
  );

  return (
    <form
      className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]"
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit({ package: values, features });
      })}
    >
      <div className="space-y-5">
        <Card>
          <CardContent className="grid gap-4 p-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Package Name</Label>
              <Input {...form.register("name")} />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input {...form.register("slug")} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Short Description</Label>
              <Input {...form.register("short_description")} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Full Description</Label>
              <Textarea {...form.register("full_description")} rows={4} />
            </div>
            <div className="space-y-2">
              <Label>Accent Color</Label>
              <Input {...form.register("accent_color")} placeholder="#16a34a" />
            </div>
            <div className="space-y-2">
              <Label>Badge Text</Label>
              <Input {...form.register("badge_text")} />
            </div>
            <div className="space-y-2">
              <Label>Badge Color</Label>
              <Input {...form.register("badge_color")} placeholder="#ef4444" />
            </div>
            <div className="space-y-2">
              <Label>Button Text</Label>
              <Input {...form.register("button_text")} />
            </div>
            <div className="space-y-2">
              <Label>Button URL</Label>
              <Input {...form.register("button_url")} />
            </div>
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input type="number" {...form.register("sort_order")} />
            </div>
            <div className="space-y-2">
              <Label>Billing Type</Label>
              <Select value={form.watch("billing_type")} onValueChange={(value) => form.setValue("billing_type", value as PackageFormData["billing_type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One time</SelectItem>
                  <SelectItem value="recurring">Recurring</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duration Type</Label>
              <Select value={form.watch("duration_type")} onValueChange={(value) => form.setValue("duration_type", value as PackageFormData["duration_type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">Days</SelectItem>
                  <SelectItem value="months">Months</SelectItem>
                  <SelectItem value="years">Years</SelectItem>
                  <SelectItem value="lifetime">Lifetime</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.watch("duration_type") !== "lifetime" ? (
              <div className="space-y-2">
                <Label>Duration Value</Label>
                <Input type="number" {...form.register("duration_value")} />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Regular Price</Label>
              <Input type="number" step="0.01" {...form.register("regular_price")} />
            </div>
            <div className="space-y-2">
              <Label>Sale Price</Label>
              <Input type="number" step="0.01" {...form.register("sale_price")} />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input {...form.register("currency")} />
            </div>
            <div className="space-y-2">
              <Label>Trial Days</Label>
              <Input type="number" {...form.register("trial_days")} />
            </div>
            <div className="space-y-2">
              <Label>Purchase Limit</Label>
              <Input type="number" {...form.register("limit_purchase_per_user")} />
            </div>
            <div className="space-y-2">
              <Label>Flags</Label>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ["is_popular", "Most Popular"],
                  ["is_highlighted", "Highlight Card"],
                  ["show_on_pricing_page", "Show on pricing"],
                  ["show_on_homepage", "Show on homepage"],
                  ["available_for_guests", "Guest access"],
                  ["available_for_logged_in", "Logged-in access"],
                  ["active", "Active"],
                  ["trial_enabled", "Trial enabled"],
                  ["renewal_allowed", "Renewal allowed"],
                  ["allow_upgrade", "Allow upgrade"],
                  ["allow_downgrade", "Allow downgrade"],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(form.watch(key as keyof PackageFormData))}
                      onChange={(event) => form.setValue(key as keyof PackageFormData, event.target.checked as never)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <FeatureRepeater features={features} onChange={setFeatures} />
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : initialValue?.id ? "Update Package" : "Create Package"}
        </Button>
      </div>

      <div className="space-y-5">
        <div>
          <p className="mb-3 text-sm font-semibold text-muted-foreground">Package Preview</p>
          <PricingCard pkg={previewPackage} />
        </div>
      </div>
    </form>
  );
}
