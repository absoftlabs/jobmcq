import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock3, FileText, Coins, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

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
  score: number;
  time_taken_seconds: number;
  coin_balance: number;
  exams_given: number;
}

export default function Index() {
  const { user, hasRole } = useAuth();
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [exams, setExams] = useState<PublicExam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [leaderboard, setLeaderboard] = useState<PublicLeaderboardRow[]>([]);

  const dashboardPath = useMemo(() => {
    if (!user) return "/auth";
    return hasRole("admin") ? "/admin" : "/student";
  }, [user, hasRole]);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const { data } = await supabase
          .from("exams")
          .select("id, title, description, duration_minutes, total_questions, reward_coins, status")
          .in("status", ["live", "ended"])
          .order("created_at", { ascending: false });

        const rows = (data || []) as PublicExam[];
        setExams(rows);
        if (rows.length > 0) setSelectedExamId(rows[0].id);
      } finally {
        setLoadingExams(false);
      }
    };

    void fetchExams();
  }, []);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!selectedExamId) {
        setLeaderboard([]);
        setLoadingLeaderboard(false);
        return;
      }

      setLoadingLeaderboard(true);
      try {
        const rpcClient = supabase as unknown as {
          rpc: (
            fn: string,
            params: { p_exam_id: string; p_limit: number },
          ) => Promise<{ data: PublicLeaderboardRow[] | null }>;
        };

        const { data } = await rpcClient.rpc("get_public_leaderboard", {
          p_exam_id: selectedExamId,
          p_limit: 10,
        });
        setLeaderboard((data || []) as PublicLeaderboardRow[]);
      } finally {
        setLoadingLeaderboard(false);
      }
    };

    void fetchLeaderboard();
  }, [selectedExamId]);

  const liveExams = exams.filter((e) => e.status === "live");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative isolate overflow-hidden border-b bg-gradient-to-b from-primary/10 via-background to-background">
        <div className="pointer-events-none absolute -left-24 top-24 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-8 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />

        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
          <div className="container flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="leading-tight">
                <p className="text-base font-bold">Job MCQ Arena</p>
                <p className="text-xs text-muted-foreground">Smart Exam Preparation</p>
              </div>
            </div>

            <nav className="hidden items-center gap-6 text-sm md:flex">
              <a href="#features" className="text-muted-foreground transition-colors hover:text-foreground">ফিচার</a>
              <a href="#exams" className="text-muted-foreground transition-colors hover:text-foreground">লাইভ এক্সাম</a>
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
              সম্পূর্ণ বাংলা MCQ প্রস্তুতি প্ল্যাটফর্ম
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
                যে কেউ exam-wise ranking দেখতে পারবে এবং প্রতিযোগিতার অবস্থান বুঝতে পারবে।
              </CardContent>
            </Card>
          </div>
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
              <p className="text-sm text-muted-foreground">সবার জন্য উন্মুক্ত exam-wise ranking</p>
            </div>
            <div className="w-full max-w-xs">
              <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                <SelectTrigger>
                  <SelectValue placeholder="পরীক্ষা নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  {exams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {loadingLeaderboard ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">এই পরীক্ষার leaderboard এখনো খালি।</div>
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
                        <p className="text-sm font-black text-accent">{Number(row.score).toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">
                          {Math.floor(row.time_taken_seconds / 60)}m {row.time_taken_seconds % 60}s
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.coin_balance} কয়েন • {row.exams_given} পরীক্ষা
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
            <p className="text-lg font-bold">Job MCQ Arena</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              স্মার্ট প্রস্তুতি, লাইভ পরীক্ষা, এবং রিওয়ার্ড ভিত্তিক শেখার একটি আধুনিক বাংলা প্ল্যাটফর্ম।
            </p>
          </div>

          <div className="space-y-2">
            <p className="font-semibold">দ্রুত লিংক</p>
            <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              <a href="#features" className="hover:text-foreground">ফিচার</a>
              <a href="#exams" className="hover:text-foreground">লাইভ এক্সাম</a>
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
            <p>© {new Date().getFullYear()} Job MCQ Arena. সর্বস্বত্ব সংরক্ষিত।</p>
            <p>Made for Bengali learners.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
