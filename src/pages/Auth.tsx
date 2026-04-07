import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { BookOpen } from "lucide-react";
import { withTimeout } from "@/lib/withTimeout";
import { resolveAccountStatus, type AccountStatus } from "@/lib/account-status";

const getStatusMessage = (status: AccountStatus) => {
  if (status === "pending") {
    return "আপনার একাউন্ট এখনো এডমিন অনুমোদনের অপেক্ষায় আছে।";
  }

  if (status === "suspended") {
    return "আপনার একাউন্ট সাময়িকভাবে বন্ধ করা হয়েছে।";
  }

  return "এই একাউন্ট দিয়ে বর্তমানে লগইন করা যাবে না।";
};

const getAccountStatus = async (userId: string): Promise<AccountStatus> => {
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("profiles")
        .select("account_status, suspended_at, last_login_at")
        .eq("user_id", userId)
        .maybeSingle(),
      8000,
      "একাউন্ট স্ট্যাটাস লোড হতে টাইমআউট হয়েছে।",
    );

    if (error || !data) {
      return "pending";
    }

    return resolveAccountStatus(data.account_status, data.suspended_at, data.last_login_at);
  } catch {
    return "pending";
  }
};

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = useMemo(() => {
    const redirect = searchParams.get("redirect");
    return redirect && redirect.startsWith("/") ? redirect : "/";
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const form = new FormData(e.currentTarget);
      const email = (form.get("email") as string).trim().toLowerCase();
      const password = form.get("password") as string;

      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        12000,
        "লগইন রিকোয়েস্ট টাইমআউট হয়েছে। আবার চেষ্টা করুন।",
      );

      if (error) {
        toast({
          title: "লগইন ব্যর্থ",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      const userId = data.user?.id;
      if (!userId) {
        toast({
          title: "লগইন ব্যর্থ",
          description: "ইউজার তথ্য পাওয়া যায়নি।",
          variant: "destructive",
        });
        return;
      }

      const roleResult = await withTimeout(
        supabase.from("user_roles").select("role").eq("user_id", userId),
        8000,
        "ইউজার role লোড হতে টাইমআউট হয়েছে।",
      ).catch(() => ({ data: [] as Array<{ role: string }> }));

      const roles = (roleResult.data || []).map((row) => row.role);
      if (!roles.includes("admin")) {
        const status = await getAccountStatus(userId);

        if (status !== "active") {
          await withTimeout(
            supabase.auth.signOut(),
            8000,
            "সেশন ক্লিয়ার করতে টাইমআউট হয়েছে।",
          ).catch(() => undefined);

          toast({
            title: "লগইন অনুমোদিত নয়",
            description: getStatusMessage(status),
            variant: "destructive",
          });
          return;
        }
      }

      await withTimeout(
        supabase.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("user_id", userId),
        8000,
        "লাস্ট লগইন আপডেট হতে টাইমআউট হয়েছে।",
      ).catch(() => undefined);

      navigate(redirectTo);
    } catch (error) {
      toast({
        title: "লগইন ব্যর্থ",
        description: error instanceof Error ? error.message : "অজানা সমস্যা হয়েছে।",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const form = new FormData(e.currentTarget);
      const email = (form.get("email") as string).trim().toLowerCase();
      const password = form.get("password") as string;
      const name = form.get("name") as string;

      const { data, error } = await withTimeout(
        supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
          },
        }),
        12000,
        "রেজিস্ট্রেশন রিকোয়েস্ট টাইমআউট হয়েছে। আবার চেষ্টা করুন।",
      );

      if (error) {
        toast({
          title: "রেজিস্ট্রেশন ব্যর্থ",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (data.user?.id) {
        await withTimeout(
          supabase
            .from("profiles")
            .update({ account_status: "pending", last_login_at: null, suspended_at: null })
            .eq("user_id", data.user.id),
          8000,
          "প্রোফাইল approval স্ট্যাটাস আপডেট হতে টাইমআউট হয়েছে।",
        ).catch(async () => {
          await withTimeout(
            supabase
              .from("profiles")
              .update({ account_status: "active", last_login_at: null, suspended_at: null })
              .eq("user_id", data.user.id),
            8000,
            "প্রোফাইল fallback approval স্ট্যাটাস আপডেট হতে টাইমআউট হয়েছে।",
          ).catch(() => undefined);
        });
      }

      await withTimeout(
        supabase.auth.signOut(),
        8000,
        "সেশন ক্লিয়ার করতে টাইমআউট হয়েছে।",
      ).catch(() => undefined);

      toast({
        title: "রেজিস্ট্রেশন সফল",
        description: "আপনার একাউন্ট তৈরি হয়েছে। এডমিন অনুমোদনের পর লগইন করতে পারবেন।",
      });
    } catch (error) {
      toast({
        title: "রেজিস্ট্রেশন ব্যর্থ",
        description: error instanceof Error ? error.message : "অজানা সমস্যা হয়েছে।",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <BookOpen className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl">চাকরির পরীক্ষা প্ল্যাটফর্ম</CardTitle>
          <CardDescription>রেজিস্ট্রেশনের পর এডমিন অনুমোদন লাগবে</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">লগইন</TabsTrigger>
              <TabsTrigger value="register">রেজিস্ট্রেশন</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">ইমেইল</Label>
                  <Input id="login-email" name="email" type="email" placeholder="আপনার ইমেইল" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">পাসওয়ার্ড</Label>
                  <Input id="login-password" name="password" type="password" placeholder="আপনার পাসওয়ার্ড" required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "লগইন হচ্ছে..." : "লগইন করুন"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name">পূর্ণ নাম</Label>
                  <Input id="reg-name" name="name" placeholder="আপনার পূর্ণ নাম" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">ইমেইল</Label>
                  <Input id="reg-email" name="email" type="email" placeholder="আপনার ইমেইল" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">পাসওয়ার্ড</Label>
                  <Input
                    id="reg-password"
                    name="password"
                    type="password"
                    placeholder="পাসওয়ার্ড (৬+ অক্ষর)"
                    required
                    minLength={6}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  রেজিস্ট্রেশন শেষ হলে এডমিন অনুমোদনের আগে লগইন করা যাবে না।
                </p>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "তৈরি হচ্ছে..." : "একাউন্ট তৈরি করুন"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
