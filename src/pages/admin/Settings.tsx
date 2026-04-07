import { useEffect, useState } from "react";
import { ImagePlus, Save, Type } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { withTimeout } from "@/lib/withTimeout";

const normalizeValue = (value: string) => value.trim();
const normalizeUrl = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export default function AdminSettings() {
  const { user } = useAuth();
  const { settings, updateSettings } = useSiteSettings();
  const [siteTitle, setSiteTitle] = useState(settings.siteTitle);
  const [siteSubtitle, setSiteSubtitle] = useState(settings.siteSubtitle);
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || "");
  const [faviconUrl, setFaviconUrl] = useState(settings.faviconUrl || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSiteTitle(settings.siteTitle);
    setSiteSubtitle(settings.siteSubtitle);
    setLogoUrl(settings.logoUrl || "");
    setFaviconUrl(settings.faviconUrl || "");
  }, [settings]);

  const handleSave = async () => {
    const nextTitle = normalizeValue(siteTitle);
    const nextSubtitle = normalizeValue(siteSubtitle);

    if (!nextTitle) {
      toast({ title: "সাইট টাইটেল দিন", variant: "destructive" });
      return;
    }

    if (!nextSubtitle) {
      toast({ title: "সাব টাইটেল দিন", variant: "destructive" });
      return;
    }

    setSaving(true);

    try {
      const payload = {
        id: 1,
        site_title: nextTitle,
        site_subtitle: nextSubtitle,
        logo_url: normalizeUrl(logoUrl),
        favicon_url: normalizeUrl(faviconUrl),
        updated_by: user?.id || null,
      };

      const { data, error } = await withTimeout(
        supabase
          .from("site_settings")
          .upsert(payload, { onConflict: "id" })
          .select("site_title, site_subtitle, logo_url, favicon_url")
          .single(),
        12000,
        "সেটিংস সংরক্ষণ হতে টাইমআউট হয়েছে।",
      );

      if (error) {
        throw error;
      }

      updateSettings({
        siteTitle: data.site_title,
        siteSubtitle: data.site_subtitle,
        logoUrl: data.logo_url,
        faviconUrl: data.favicon_url,
      });

      toast({ title: "সেটিংস সংরক্ষিত হয়েছে" });
    } catch (error) {
      toast({
        title: "সেটিংস সংরক্ষণ ব্যর্থ",
        description: error instanceof Error ? error.message : "অজানা সমস্যা হয়েছে।",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
        <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-primary/80">Website Settings</p>
            <h1 className="text-2xl font-black tracking-tight md:text-3xl">ব্র্যান্ডিং সেটিংস</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              ড্যাশবোর্ড থেকেই সাইটের logo, favicon, title এবং subtitle আপডেট করুন।
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2 self-start md:self-auto">
            <Save className="h-4 w-4" />
            {saving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle>সাইট পরিচিতি</CardTitle>
            <CardDescription>যে তথ্যগুলো header, footer, browser title এবং favicon-এ ব্যবহার হবে</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="site-title">সাইট টাইটেল</Label>
              <Input
                id="site-title"
                value={siteTitle}
                onChange={(event) => setSiteTitle(event.target.value)}
                placeholder="চাকরির প্রস্তুতি"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="site-subtitle">সাব টাইটেল</Label>
              <Input
                id="site-subtitle"
                value={siteSubtitle}
                onChange={(event) => setSiteSubtitle(event.target.value)}
                placeholder="সম্পূর্ণ বাংলা MCQ প্রস্তুতি প্ল্যাটফর্ম"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="site-logo">লোগো URL</Label>
              <Input
                id="site-logo"
                value={logoUrl}
                onChange={(event) => setLogoUrl(event.target.value)}
                placeholder="https://example.com/logo.png"
              />
              <p className="text-xs text-muted-foreground">Square image URL দিলে header ও sidebar-এ ভালো দেখাবে।</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="site-favicon">ফেবিকন URL</Label>
              <Input
                id="site-favicon"
                value={faviconUrl}
                onChange={(event) => setFaviconUrl(event.target.value)}
                placeholder="https://example.com/favicon.ico"
              />
              <p className="text-xs text-muted-foreground">`.ico`, `.png` বা ছোট square icon URL ব্যবহার করুন।</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>লাইভ প্রিভিউ</CardTitle>
            <CardDescription>সংরক্ষণ করার আগে branding কেমন দেখাবে</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border bg-muted/30 p-5">
              <div className="flex items-center gap-3">
                {normalizeUrl(logoUrl) ? (
                  <img
                    src={normalizeUrl(logoUrl) || undefined}
                    alt={normalizeValue(siteTitle) || settings.siteTitle}
                    className="h-14 w-14 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <ImagePlus className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold">{normalizeValue(siteTitle) || settings.siteTitle}</p>
                  <p className="text-sm text-muted-foreground">
                    {normalizeValue(siteSubtitle) || settings.siteSubtitle}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-muted/30 p-5">
              <p className="mb-3 text-sm font-semibold">Browser tab</p>
              <div className="flex items-center gap-3 rounded-xl border bg-background px-3 py-2">
                {normalizeUrl(faviconUrl) ? (
                  <img
                    src={normalizeUrl(faviconUrl) || undefined}
                    alt="Favicon preview"
                    className="h-5 w-5 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/15 text-primary">
                    <Type className="h-3 w-3" />
                  </div>
                )}
                <span className="truncate text-sm">{normalizeValue(siteTitle) || settings.siteTitle}</span>
              </div>
            </div>

            <div className="rounded-2xl border bg-muted/30 p-5 text-sm text-muted-foreground">
              Save করার পর public site, admin sidebar, student sidebar, browser title এবং favicon একসাথে আপডেট হবে।
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
