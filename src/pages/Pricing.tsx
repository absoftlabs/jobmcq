import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PricingCard } from "@/components/subscriptions/PricingCard";
import { usePricingPackages, useSubscriptionSettings } from "@/hooks/use-subscriptions";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

export default function PricingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings: siteSettings } = useSiteSettings();
  const packagesQuery = usePricingPackages();
  const settingsQuery = useSubscriptionSettings();

  const settings = settingsQuery.data;
  const packages = packagesQuery.data || [];

  const featureRows = useMemo(() => {
    const allKeys = Array.from(new Set(packages.flatMap((pkg) => pkg.features.map((feature) => feature.feature_key))));
    return allKeys.map((key) => ({
      key,
      label: packages.flatMap((pkg) => pkg.features).find((feature) => feature.feature_key === key)?.feature_label || key,
      values: packages.map((pkg) => pkg.features.find((feature) => feature.feature_key === key)),
    }));
  }, [packages]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/")}>{siteSettings.siteTitle}</Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate("/flash-cards")}>ফ্ল্যাশ কার্ড</Button>
            <Button onClick={() => navigate(user ? "/student/subscription" : "/auth?redirect=/pricing")}>{user ? "আমার প্ল্যান" : "লগইন"}</Button>
          </div>
        </div>
      </header>

      <main className="container space-y-12 py-12">
        <section className="space-y-4 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary/80">সাবস্ক্রিপশন প্যাকেজ</p>
          <h1 className="text-4xl font-black tracking-tight md:text-6xl">{settings?.pricing_page_title || "আপনার প্ল্যান নির্বাচন করুন"}</h1>
          <p className="mx-auto max-w-3xl text-base text-muted-foreground md:text-lg">
            {settings?.pricing_page_subtitle || "আপনার প্রস্তুতির ধরন অনুযায়ী প্যাকেজ বেছে নিয়ে প্রিমিয়াম এমসিকিউ সুবিধা চালু করুন।"}
          </p>
        </section>

        {packagesQuery.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <section className="grid gap-6 lg:grid-cols-3 xl:grid-cols-5">
            {packages.map((pkg) => (
              <PricingCard
                key={pkg.id}
                pkg={pkg}
                currencySymbol={settings?.currency_symbol || "BDT"}
                showDiscountBadge={settings?.show_discount_badge ?? true}
                showPopularRibbon={settings?.show_popular_ribbon ?? true}
                onSubscribe={() => navigate(user ? `/pricing/checkout/${pkg.slug}` : `/auth?redirect=/pricing/checkout/${pkg.slug}`)}
              />
            ))}
          </section>
        )}

        {settings?.show_comparison_table ? (
          <section className="space-y-4">
            <div className="text-center">
              <h2 className="text-3xl font-black tracking-tight">ফিচার তুলনা</h2>
              <p className="text-sm text-muted-foreground">সাবস্ক্রিপশন নেওয়ার আগে প্রতিটি প্যাকেজের সুবিধা তুলনা করুন।</p>
            </div>
            <Card className="overflow-hidden">
              <CardContent className="overflow-x-auto p-0">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">ফিচার</th>
                      {packages.map((pkg) => (
                        <th key={pkg.id} className="px-4 py-3 text-left font-semibold">{pkg.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {featureRows.map((row) => (
                      <tr key={row.key} className="border-t">
                        <td className="px-4 py-3 font-medium">{row.label}</td>
                        {row.values.map((feature, index) => (
                          <td key={`${row.key}-${packages[index]?.id}`} className="px-4 py-3 text-muted-foreground">
                            {feature?.feature_value || "না"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </section>
        ) : null}

        {settings?.show_support_block ? (
          <section>
            <Card className="border-primary/20 bg-gradient-to-r from-primary/10 to-background">
              <CardHeader>
                <CardTitle>প্ল্যান বেছে নিতে সাহায্য লাগবে?</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-muted-foreground">
                  কাস্টম প্যাকেজ, প্রতিষ্ঠানিক এক্সেস বা একাধিক শিক্ষার্থীর জন্য সেটআপ চাইলে সাপোর্টে যোগাযোগ করুন।
                </p>
                <Button variant="outline" onClick={() => navigate("/auth")}>যোগাযোগ / লগইন</Button>
              </CardContent>
            </Card>
          </section>
        ) : null}
      </main>
    </div>
  );
}
