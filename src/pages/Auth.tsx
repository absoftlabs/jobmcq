import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { BookOpen } from "lucide-react";

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.get("email") as string,
      password: form.get("password") as string,
    });
    setLoading(false);
    if (error) {
      toast({ title: "লগইন ব্যর্থ", description: error.message, variant: "destructive" });
    } else {
      navigate("/");
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signUp({
      email: form.get("email") as string,
      password: form.get("password") as string,
      options: { data: { full_name: form.get("name") as string } },
    });
    setLoading(false);
    if (error) {
      toast({ title: "রেজিস্ট্রেশন ব্যর্থ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "রেজিস্ট্রেশন সফল!", description: "আপনার একাউন্ট তৈরি হয়েছে।" });
      navigate("/");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <BookOpen className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl">চাকরির পরিক্ষা প্ল্যাটফর্ম</CardTitle>
          <CardDescription>MCQ পরিক্ষার প্রস্তুতি নিন</CardDescription>
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
                  <Label htmlFor="login-password">পাসওয়ার্ড</Label>
                  <Input id="login-password" name="password" type="password" placeholder="আপনার পাসওয়ার্ড" required />
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
                  <Label htmlFor="reg-password">পাসওয়ার্ড</Label>
                  <Input id="reg-password" name="password" type="password" placeholder="পাসওয়ার্ড (৬+ অক্ষর)" required minLength={6} />
                </div>
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
