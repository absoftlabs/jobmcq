import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PricingCard } from "@/components/subscriptions/PricingCard";
import { usePricingPackages, useSubscriptionSettings } from "@/hooks/use-subscriptions";
import { Trophy, Clock3, FileText, Coins, ArrowRight, ShieldCheck, Sparkles, Layers } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { withTimeout } from "@/lib/withTimeout";

interface PublicExam {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  total_questions: number;
  reward_coins: number;
  status: "live" | "ended" | "draft" | "scheduled";
}

interface PublicLeaderboardRow {
  rank: number;
  user_id: string;
  full_name: string;
  points: number;
  passed_exams: number;
}
interface FlashCardCategoryPreview {
  id: string;
  name: string;
  description: string | null;
}

export default function Index() {
  const { user, hasRole } = useAuth();
  const { settings } = useSiteSettings();
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [loadingFlashCards, setLoadingFlashCards] = useState(true);
  const [exams, setExams] = useState<PublicExam[]>([]);
  const [leaderboard, setLeaderboard] = useState<PublicLeaderboardRow[]>([]);
  const [flashCategories, setFlashCategories] = useState<FlashCardCategoryPreview[]>([]);
  const [totalFlashCards, setTotalFlashCards] = useState(0);
  const homepagePackagesQuery = usePricingPackages(true);
  const subscriptionSettingsQuery = useSubscriptionSettings();

  const dashboardPath = useMemo(() => {
    if (!user) return "/auth";
    return hasRole("admin") ? "/admin" : "/student";
  }, [user, hasRole]);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const { data } = await withTimeout(
          supabase
            .from("exams")
            .select("id, title, description, duration_minutes, total_questions, reward_coins, status")
            .in("status", ["live", "ended"])
            .order("created_at", { ascending: false })
            .throwOnError(),
          12000,
          "এক্সাম ডাটা লোড হতে টাইমআউট হয়েছে।",
        );
        const rows = (data || []) as PublicExam[];
        setExams(rows);
      } catch (error) {
        toast({
          title: "এক্সাম ডাটা লোড হয়নি",
          description: error instanceof Error ? error.message : "অজানা সমস্যা হয়েছে।",
          variant: "destructive",
        });
        setExams([]);
      } finally {
        setLoadingExams(false);
      }
    };

    void fetchExams();
  }, []);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoadingLeaderboard(true);
      try {
        const { data } = await withTimeout(
          supabase.rpc("get_public_global_leaderboard", { p_limit: 10 }).throwOnError(),
          12000,
          "লিডারবোর্ড ডাটা লোড হতে টাইমআউট হয়েছে।",
        );
        setLeaderboard((data || []) as PublicLeaderboardRow[]);
      } catch (error) {
        toast({
          title: "লিডারবোর্ড লোড হয়নি",
          description: error instanceof Error ? error.message : "অজানা সমস্যা হয়েছে।",
          variant: "destructive",
        });
        setLeaderboard([]);
      } finally {
        setLoadingLeaderboard(false);
      }
    };

    void fetchLeaderboard();
  }, []);

  useEffect(() => {
    const fetchFlashCardPreview = async () => {
      setLoadingFlashCards(true);
      try {
        const [categoryRes, countRes] = await Promise.allSettled([
          withTimeout(
            supabase
              .from("flash_card_categories")
              .select("id, name, description")
              .eq("is_active", true)
              .order("sort_order")
              .limit(6)
              .throwOnError(),
            12000,
            "ফ্ল্যাশ কার্ড ক্যাটাগরি লোড হতে টাইমআউট হয়েছে।",
          ),
          withTimeout(
            supabase
              .from("flash_cards")
              .select("id", { count: "exact", head: true })
              .eq("is_enabled", true)
              .throwOnError(),
            12000,
            "ফ্ল্যাশ কার্ড কাউন্ট লোড হতে টাইমআউট হয়েছে।",
          ),
        ]);

        if (categoryRes.status === "fulfilled") {
          setFlashCategories((categoryRes.value.data || []) as FlashCardCategoryPreview[]);
        } else {
          setFlashCategories([]);
          toast({
            title: "ফ্ল্যাশ কার্ড ক্যাটাগরি লোড হয়নি",
            description:
              categoryRes.reason instanceof Error
                ? categoryRes.reason.message
                : "ফ্ল্যাশ কার্ড ক্যাটাগরি query ব্যর্থ হয়েছে।",
            variant: "destructive",
          });
        }

        if (countRes.status === "fulfilled") {
          setTotalFlashCards(countRes.value.count || 0);
        } else {
          setTotalFlashCards(0);
        }
      } finally {
        setLoadingFlashCards(false);
      }
    };

    void fetchFlashCardPreview();
  }, []);

  const liveExams = exams.filter((e) => e.status === "live");
  const flashCardPlayPath = user && hasRole("student") ? "/student/flash-cards" : "/play/flash-cards";
  const homepagePackages = homepagePackagesQuery.data || [];
  const subscriptionSettings = subscriptionSettingsQuery.data;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative isolate overflow-hidden border-b bg-gradient-to-b from-primary/10 via-background to-background">
        <div className="pointer-events-none absolute -left-24 top-24 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-8 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />

        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
          <div className="container flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.siteTitle}
                  className="h-9 w-9 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
              )}
              <div className="leading-tight">
                <p className="text-base font-bold">{settings.siteTitle}</p>
                <p className="text-xs text-muted-foreground">{settings.siteSubtitle}</p>
              </div>
            </div>

            <nav className="hidden items-center gap-6 text-sm md:flex">
              <a href="#features" className="text-muted-foreground transition-colors hover:text-foreground">ফিচার</a>
              <a href="#pricing" className="text-muted-foreground transition-colors hover:text-foreground">প্রাইসিং</a>
              <a href="#exams" className="text-muted-foreground transition-colors hover:text-foreground">লাইভ এক্সাম</a>
              <Link to="/flash-cards" className="text-muted-foreground transition-colors hover:text-foreground">ফ্ল্যাশ কার্ড</Link>
              <a href="#leaderboard" className="text-muted-foreground transition-colors hover:text-foreground">লিডারবোর্ড</a>
            </nav>

            <Link to={dashboardPath}>
              <Button className="shadow-sm">{user ? "ড্যাশবোর্ড" : "লগইন"}</Button>
            </Link>
          </div>
        </header>

        <section className="container relative grid gap-10 py-14 md:grid-cols-2 md:items-center md:py-20">
          <div className="animate-fade-rise space-y-5">
            <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
              {settings.siteSubtitle}
            </Badge>
            <h1 className="text-balance text-4xl font-black leading-[1.34] tracking-tight md:text-6xl md:leading-[1.28]">
              প্রস্তুতিকে দিন নতুন গতি,
              <span className="block text-primary">পরীক্ষায় দেখান সেরা পারফরম্যান্স</span>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              লাইভ পরীক্ষা, বিশদ স্কোর বিশ্লেষণ, পাস করলে অটো কয়েন রিওয়ার্ড, এবং সবার জন্য পাবলিক লিডারবোর্ড।
              পরীক্ষা দিতে চাইলে অবশ্যই লগইন করতে হবে।
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <a href="#exams">
                <Button size="lg" className="gap-2">
                  এক্সাম দেখুন <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
              <Link to={dashboardPath}>
                <Button size="lg" variant="outline">
                  {user ? "আমার প্যানেল" : "লগইন করুন"}
                </Button>
              </Link>
            </div>
          </div>

          <Card className="animate-fade-rise border-primary/20 shadow-lg shadow-primary/10 [animation-delay:120ms]">
            <CardHeader>
              <CardTitle className="text-xl">Quick Overview</CardTitle>
              <CardDescription>রিয়েল-টাইম প্রস্তুতির চিত্র</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border bg-muted/40 p-4 text-center">
                <p className="text-3xl font-black text-primary">{liveExams.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">লাইভ পরীক্ষা</p>
              </div>
              <div className="rounded-xl border bg-muted/40 p-4 text-center">
                <p className="text-3xl font-black text-accent">{leaderboard.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">টপ র‌্যাঙ্ক</p>
              </div>
              <div className="rounded-xl border bg-muted/40 p-4 text-center">
                <p className="text-3xl font-black">24/7</p>
                <p className="mt-1 text-xs text-muted-foreground">অ্যাক্সেস</p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      <main className="container space-y-16 py-16 md:space-y-20">
        <section id="features" className="space-y-6">
          <div className="space-y-2 text-left">
            <h2 className="text-3xl font-black tracking-tight">প্ল্যাটফর্ম ফিচার</h2>
            <p className="text-sm text-muted-foreground">শুরু থেকে পরীক্ষা পর্যন্ত সম্পূর্ণ একটি আধুনিক অভিজ্ঞতা</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheck className="h-5 w-5 text-primary" /> লগইন-গেটেড পরীক্ষা
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground">
                নিরাপদ পরীক্ষা পরিবেশ নিশ্চিত করতে লগইন ছাড়া পরীক্ষা শুরু করা যাবে না।
              </CardContent>
            </Card>

            <Card className="group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Coins className="h-5 w-5 text-accent" /> অটো কয়েন রিওয়ার্ড
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground">
                পরীক্ষায় পাস করলে নির্ধারিত কয়েন স্বয়ংক্রিয়ভাবে শিক্ষার্থীর ওয়ালেটে যোগ হবে।
              </CardContent>
            </Card>

            <Card className="group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trophy className="h-5 w-5 text-primary" /> সবার জন্য লিডারবোর্ড
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground">
                যে কেউ global ranking দেখতে পারবে এবং প্রতিযোগিতার অবস্থান বুঝতে পারবে।
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="pricing" className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2 text-left">
              <h2 className="text-3xl font-black tracking-tight">সাবস্ক্রিপশন প্ল্যান</h2>
              <p className="text-sm text-muted-foreground">প্রস্তুতির গভীরতা অনুযায়ী প্ল্যান বেছে নিন</p>
            </div>
            <Link to="/pricing">
              <Button variant="outline" className="gap-2">
                সব প্ল্যান দেখুন <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {homepagePackagesQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : homepagePackages.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                এখনো কোনো subscription package homepage-এ show করার জন্য active করা হয়নি।
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {homepagePackages.slice(0, 3).map((pkg) => (
                <PricingCard
                  key={pkg.id}
                  pkg={pkg}
                  currencySymbol={subscriptionSettings?.currency_symbol || "BDT"}
                  showDiscountBadge={subscriptionSettings?.show_discount_badge ?? true}
                  showPopularRibbon={subscriptionSettings?.show_popular_ribbon ?? true}
                  onSubscribe={() => window.location.assign(user ? `/pricing/checkout/${pkg.slug}` : `/auth?redirect=/pricing/checkout/${pkg.slug}`)}
                />
              ))}
            </div>
          )}
        </section>

        <section id="flash-cards" className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2 text-left">
              <h2 className="text-3xl font-black tracking-tight">ফ্ল্যাশ কার্ড</h2>
              <p className="text-sm text-muted-foreground">ক্যাটাগরি ধরে প্র্যাকটিস করুন, দ্রুত রিভিশন দিন</p>
            </div>
            <div className="flex gap-2">
              <Link to="/flash-cards">
                <Button variant="outline">সব ফ্ল্যাশ কার্ড দেখুন</Button>
              </Link>
              <Link to={flashCardPlayPath}>
                <Button className="gap-2">খেলা শুরু <ArrowRight className="h-4 w-4" /></Button>
              </Link>
            </div>
          </div>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-5">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <Badge variant="outline" className="gap-1 border-primary/30 bg-background/80 text-primary">
                  <Layers className="h-3.5 w-3.5" /> মোট কার্ড: {totalFlashCards}
                </Badge>
                <p className="text-muted-foreground">দ্রুত প্র্যাকটিসের জন্য যেকোনো ক্যাটাগরি থেকে শুরু করতে পারেন।</p>
              </div>
            </CardContent>
          </Card>

          {loadingFlashCards ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : flashCategories.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                এখনো কোনো ফ্ল্যাশ কার্ড ক্যাটাগরি নেই।
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {flashCategories.map((category) => (
                <Card key={category.id} className="transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                    <CardDescription className="line-clamp-2 min-h-10">
                      {category.description || "এই ক্যাটাগরি থেকে প্রশ্ন অনুশীলন করে দক্ষতা বাড়ান।"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link to={`${flashCardPlayPath}?category=${category.id}`}>
                      <Button variant="secondary" className="w-full gap-2">
                        এই ক্যাটাগরিতে খেলুন <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section id="exams" className="space-y-6">
          <div className="space-y-2 text-left">
            <h2 className="text-3xl font-black tracking-tight">লাইভ এক্সাম লিস্ট</h2>
            <p className="text-sm text-muted-foreground">এক্সাম বেছে নিয়ে অংশ নিতে বাটনে ক্লিক করুন</p>
          </div>

          {loadingExams ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : liveExams.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">এই মুহূর্তে কোনো লাইভ পরীক্ষা নেই।</CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {liveExams.map((exam) => (
                <Card key={exam.id} className="flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <CardHeader className="space-y-2">
                    <CardTitle className="line-clamp-2 text-xl">{exam.title}</CardTitle>
                    <CardDescription className="line-clamp-2 min-h-10">
                      {exam.description || "পরীক্ষার বিস্তারিত জানতে অংশগ্রহণ করুন।"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col justify-between gap-4">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline" className="gap-1">
                        <FileText className="h-3 w-3" /> {exam.total_questions} প্রশ্ন
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Clock3 className="h-3 w-3" /> {exam.duration_minutes} মিনিট
                      </Badge>
                      <Badge variant="secondary" className="gap-1 bg-accent/10 text-accent">
                        <Coins className="h-3 w-3" /> {exam.reward_coins} কয়েন
                      </Badge>
                    </div>
                    <Link to={user ? "/student/exams" : "/auth"} className="block">
                      <Button className="w-full">পরীক্ষা দিন</Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section id="leaderboard" className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2 text-left">
            <h2 className="text-3xl font-black tracking-tight">পাবলিক লিডারবোর্ড</h2>
              <p className="text-sm text-muted-foreground">সবার জন্য উন্মুক্ত global ranking (কয়েন/পয়েন্ট ভিত্তিক)</p>
            </div>
          </div>

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {loadingLeaderboard ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">লিডারবোর্ড এখনো খালি।</div>
              ) : (
                <div className="divide-y">
                  {leaderboard.map((row) => (
                    <div key={`${row.rank}-${row.full_name}`} className="flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-muted/50 sm:px-6">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {row.rank <= 3 ? ["🥇", "🥈", "🥉"][row.rank - 1] : row.rank}
                        </span>
                        <span className="font-semibold">{row.full_name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {row.points} কয়েন • {row.passed_exams} পাস
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t bg-muted/30">
        <div className="container grid gap-8 py-10 md:grid-cols-3">
          <div className="space-y-2">
            <p className="text-lg font-bold">{settings.siteTitle}</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {settings.siteSubtitle}
            </p>
          </div>

          <div className="space-y-2">
            <p className="font-semibold">দ্রুত লিংক</p>
            <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              <a href="#features" className="hover:text-foreground">ফিচার</a>
              <a href="#pricing" className="hover:text-foreground">প্রাইসিং</a>
              <a href="#exams" className="hover:text-foreground">লাইভ এক্সাম</a>
              <Link to="/flash-cards" className="hover:text-foreground">ফ্ল্যাশ কার্ড</Link>
              <a href="#leaderboard" className="hover:text-foreground">লিডারবোর্ড</a>
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-semibold">শুরু করুন</p>
            <p className="text-sm text-muted-foreground">পরীক্ষা দিতে লগইন করুন এবং আজই আপনার র‌্যাঙ্ক উন্নত করুন।</p>
            <Link to={dashboardPath}>
              <Button size="sm">{user ? "ড্যাশবোর্ডে যান" : "লগইন করুন"}</Button>
            </Link>
          </div>
        </div>

        <div className="border-t">
          <div className="container flex flex-col items-start justify-between gap-2 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center">
            <p>© {new Date().getFullYear()} {settings.siteTitle}. সর্বস্বত্ব সংরক্ষিত।</p>
            <p>Made for Bengali learners.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}




