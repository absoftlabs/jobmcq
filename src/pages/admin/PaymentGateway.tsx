import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function AdminPaymentGateway() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [baseUrl, setBaseUrl] = useState("https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [appKey, setAppKey] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("");
  const [frontendBaseUrl, setFrontendBaseUrl] = useState("");
  const [environment, setEnvironment] = useState<"sandbox" | "live">("sandbox");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("payment_gateway_settings")
        .select("*")
        .eq("provider", "bkash")
        .maybeSingle();

      if (error) {
        toast({ title: "সেটিংস লোড ব্যর্থ", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      if (data) {
        const config = (data.config || {}) as Record<string, string>;
        setEnabled(data.is_enabled);
        setBaseUrl(config.base_url || "https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout");
        setUsername(config.username || "");
        setPassword(config.password || "");
        setAppKey(config.app_key || "");
        setAppSecret(config.app_secret || "");
        setCallbackUrl(config.callback_url || "");
        setFrontendBaseUrl(config.frontend_base_url || "");
        setEnvironment((config.environment as "sandbox" | "live") || "sandbox");
      }

      setLoading(false);
    };

    void load();
  }, [toast]);

  const save = async () => {
    if (!user) return;
    if (enabled) {
      if (!username.trim() || !password.trim() || !appKey.trim() || !appSecret.trim()) {
        toast({ title: "Required fields missing", description: "Username, Password, App Key, App Secret দিন।", variant: "destructive" });
        return;
      }
    }

    setSaving(true);
    const payload: TablesInsert<"payment_gateway_settings"> = {
      provider: "bkash",
      display_name: "bKash Checkout",
      is_enabled: enabled,
      updated_by: user.id,
      config: {
        environment,
        base_url: baseUrl.trim(),
        username: username.trim(),
        password: password.trim(),
        app_key: appKey.trim(),
        app_secret: appSecret.trim(),
        callback_url: callbackUrl.trim(),
        frontend_base_url: frontendBaseUrl.trim(),
      },
    };

    const { error } = await supabase
      .from("payment_gateway_settings")
      .upsert(payload, { onConflict: "provider" });

    if (error) {
      setSaving(false);
      toast({ title: "সেভ ব্যর্থ", description: error.message, variant: "destructive" });
      return;
    }

    setSaving(false);
    toast({ title: "bKash settings সেভ হয়েছে" });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Payment Gateway</h1>
        <p className="text-sm text-muted-foreground">bKash checkout configuration এখানে সেট করুন।</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>bKash Settings</CardTitle>
          <CardDescription>Developer portal credentials ও callback URL দিন।</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              লোড হচ্ছে...
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Gateway Status</Label>
                  <Select value={enabled ? "enabled" : "disabled"} onValueChange={(v) => setEnabled(v === "enabled")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enabled">Enabled</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Environment</Label>
                  <Select value={environment} onValueChange={(v) => setEnvironment(v as "sandbox" | "live")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Base URL</Label>
                  <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://tokenized.sandbox.bka.sh/..." />
                </div>

                <div className="space-y-2">
                  <Label>Callback URL</Label>
                  <Input value={callbackUrl} onChange={(e) => setCallbackUrl(e.target.value)} placeholder="https://your-domain.com/payment/bkash/callback" />
                </div>

                <div className="space-y-2">
                  <Label>Frontend Base URL</Label>
                  <Input value={frontendBaseUrl} onChange={(e) => setFrontendBaseUrl(e.target.value)} placeholder="https://your-domain.com" />
                </div>

                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>App Key</Label>
                  <Input value={appKey} onChange={(e) => setAppKey(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>App Secret</Label>
                  <Input type="password" value={appSecret} onChange={(e) => setAppSecret(e.target.value)} />
                </div>
              </div>

              <Button onClick={() => void save()} disabled={saving}>
                {saving ? "Saving..." : "Save Gateway Settings"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
