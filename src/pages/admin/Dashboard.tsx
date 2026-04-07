import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { withTimeout } from "@/lib/withTimeout";
import {
  AlertTriangle,
  ArrowUpRight,
  ClipboardCheck,
  FileText,
  PlayCircle,
  TrendingUp,
  Users,
} from "lucide-react";

interface Stats {
  totalUsers: number;
  totalExams: number;
  liveExams: number;
  totalAttempts: number;
  passRate: number;
  pendingReports: number;
}

type CountResponse = { count: number | null; error: { message: string } | null };

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalExams: 0,
    liveExams: 0,
    totalAttempts: 0,
    passRate: 0,
    pendingReports: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, examsRes, liveRes, attemptsRes, passedRes, reportsRes] = await Promise.allSettled([
          withTimeout(
            supabase.from("profiles").select("id", { count: "exact", head: true }).throwOnError(),
            12000,
            "ইউজার স্ট্যাটস লোড হতে টাইমআউট হয়েছে।",
          ),
          withTimeout(
            supabase.from("exams").select("id", { count: "exact", head: true }).throwOnError(),
            12000,
            "এক্সাম স্ট্যাটস লোড হতে টাইমআউট হয়েছে।",
          ),
          withTimeout(
            supabase.from("exams").select("id", { count: "exact", head: true }).eq("status", "live").throwOnError(),
            12000,
            "লাইভ এক্সাম স্ট্যাটস লোড হতে টাইমআউট হয়েছে।",
          ),
          withTimeout(
            supabase
              .from("attempts")
              .select("id", { count: "exact", head: true })
              .not("submitted_at", "is", null)
              .throwOnError(),
            12000,
            "অ্যাটেম্পট স্ট্যাটস লোড হতে টাইমআউট হয়েছে।",
          ),
          withTimeout(
            supabase.from("attempts").select("id", { count: "exact", head: true }).eq("is_passed", true).throwOnError(),
            12000,
            "পাসড অ্যাটেম্পট স্ট্যাটস লোড হতে টাইমআউট হয়েছে।",
          ),
          withTimeout(
            supabase
              .from("question_reports")
              .select("id", { count: "exact", head: true })
              .eq("status", "pending")
              .throwOnError(),
            12000,
            "রিপোর্ট স্ট্যাটস লোড হতে টাইমআউট হয়েছে।",
          ),
        ]);

        const getCount = (result: PromiseSettledResult<CountResponse>, label: string) => {
          if (result.status === "fulfilled" && !result.value.error) {
            return result.value.count ?? 0;
          }

          const message =
            result.status === "fulfilled"
              ? result.value.error?.message || `${label} query ব্যর্থ হয়েছে।`
              : result.reason instanceof Error
                ? result.reason.message
                : `${label} query ব্যর্থ হয়েছে।`;

          toast({
            title: `${label} লোড হয়নি`,
            description: message,
            variant: "destructive",
          });

          return 0;
        };

        const totalAttempts = getCount(attemptsRes, "Attempt");
        const passed = getCount(passedRes, "Passed attempt");

        setStats({
          totalUsers: getCount(usersRes, "User"),
          totalExams: getCount(examsRes, "Exam"),
          liveExams: getCount(liveRes, "Live exam"),
          totalAttempts,
          passRate: totalAttempts > 0 ? Math.round((passed / totalAttempts) * 100) : 0,
          pendingReports: getCount(reportsRes, "Report"),
        });
      } finally {
        setLoading(false);
      }
    };

    void fetchStats();
  }, []);

  const cards = useMemo(
    () => [
      {
        title: "মোট পরীক্ষার্থী",
        value: stats.totalUsers,
        subtitle: "সিস্টেমে সক্রিয় শিক্ষার্থী",
        icon: Users,
        iconWrap: "bg-primary/15 text-primary",
        glow: "from-primary/25 via-primary/10 to-transparent",
      },
      {
        title: "মোট পরীক্ষা",
        value: stats.totalExams,
        subtitle: "তৈরি হওয়া এক্সামের সংখ্যা",
        icon: FileText,
        iconWrap: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
        glow: "from-blue-500/25 via-blue-500/10 to-transparent",
      },
      {
        title: "লাইভ পরীক্ষা",
        value: stats.liveExams,
        subtitle: "বর্তমানে চলমান পরীক্ষা",
        icon: PlayCircle,
        iconWrap: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        glow: "from-emerald-500/25 via-emerald-500/10 to-transparent",
      },
      {
        title: "মোট Attempt",
        value: stats.totalAttempts,
        subtitle: "সাবমিট করা সকল attempt",
        icon: ClipboardCheck,
        iconWrap: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
        glow: "from-violet-500/25 via-violet-500/10 to-transparent",
      },
      {
        title: "পাসের হার",
        value: `${stats.passRate}%`,
        subtitle: "সর্বমোট pass performance",
        icon: TrendingUp,
        iconWrap: "bg-accent/15 text-accent",
        glow: "from-accent/25 via-accent/10 to-transparent",
      },
      {
        title: "পেন্ডিং রিপোর্ট",
        value: stats.pendingReports,
        subtitle: "রিভিউ অপেক্ষমাণ অভিযোগ",
        icon: AlertTriangle,
        iconWrap: "bg-destructive/15 text-destructive",
        glow: "from-destructive/25 via-destructive/10 to-transparent",
      },
    ],
    [stats],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="pointer-events-none absolute -right-14 -top-14 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />
        <CardContent className="relative p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-primary/80">Admin Control Center</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">অ্যাডমিন ড্যাশবোর্ড</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            প্ল্যাটফর্মের সামগ্রিক অবস্থা, পরীক্ষার অগ্রগতি এবং রিভিউ প্রয়োজন এমন গুরুত্বপূর্ণ মেট্রিকগুলো এখানে দেখুন।
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card
            key={card.title}
            className="group relative overflow-hidden border-border/70 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/10"
          >
            <div
              className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.glow} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
            />
            <CardHeader className="relative flex flex-row items-start justify-between pb-2">
              <div>
                <CardTitle className="text-sm font-semibold text-muted-foreground">{card.title}</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">{card.subtitle}</p>
              </div>
              <div className={`rounded-xl p-2.5 ${card.iconWrap}`}>
                <card.icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="flex items-end justify-between">
                <p className="text-3xl font-black tracking-tight">{card.value}</p>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">সিস্টেম হেলথ স্ন্যাপশট</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
              <span className="text-muted-foreground">লাইভ পরীক্ষা রেশিও</span>
              <span className="font-semibold">
                {stats.totalExams > 0 ? Math.round((stats.liveExams / stats.totalExams) * 100) : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
              <span className="text-muted-foreground">রিপোর্ট প্রেসার</span>
              <span className="font-semibold">
                {stats.pendingReports > 10 ? "High" : stats.pendingReports > 0 ? "Moderate" : "Low"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
              <span className="text-muted-foreground">পারফরম্যান্স স্কোর</span>
              <span className="font-semibold">
                {stats.passRate >= 70 ? "Strong" : stats.passRate >= 40 ? "Average" : "Needs Attention"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Insight</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>মোট {stats.totalUsers} জন শিক্ষার্থীর মধ্যে {stats.totalAttempts} টি attempt রেকর্ড হয়েছে।</p>
            <p>বর্তমানে {stats.liveExams} টি পরীক্ষা লাইভ আছে এবং গড় পাসের হার {stats.passRate}%।</p>
            <p>
              রিপোর্ট কিউতে {stats.pendingReports} টি আইটেম আছে, প্রয়োজন হলে Reports section থেকে রিভিউ করুন।
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
