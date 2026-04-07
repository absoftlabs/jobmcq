import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, BookOpen, Coins, ClipboardList, Trophy } from "lucide-react";
import { Link } from "react-router-dom";

export default function StudentDashboard() {
  const { profile } = useAuth();

  const cards = [
    {
      title: "লাইভ পরীক্ষা",
      desc: "চলমান পরীক্ষায় অংশ নিয়ে নিজের স্কোর বাড়ান",
      icon: BookOpen,
      link: "/student/exams",
      iconWrap: "bg-primary/15 text-primary",
      glow: "from-primary/25 via-primary/10 to-transparent",
    },
    {
      title: "আমার পরীক্ষা",
      desc: "সাবমিট করা পরীক্ষার রেজাল্ট ও বিশ্লেষণ দেখুন",
      icon: ClipboardList,
      link: "/student/my-exams",
      iconWrap: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
      glow: "from-blue-500/25 via-blue-500/10 to-transparent",
    },
    {
      title: "লিডারবোর্ড",
      desc: "সবাইয়ের মধ্যে আপনার বর্তমান অবস্থান দেখুন",
      icon: Trophy,
      link: "/student/leaderboard",
      iconWrap: "bg-accent/15 text-accent",
      glow: "from-accent/25 via-accent/10 to-transparent",
    },
    {
      title: "কয়েন ওয়ালেট",
      desc: `মোট ব্যালেন্স: ${profile?.coin_balance ?? 0} কয়েন`,
      icon: Coins,
      link: "/student/wallet",
      iconWrap: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
      glow: "from-amber-500/25 via-amber-500/10 to-transparent",
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/15 blur-2xl" />
        <CardContent className="relative p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-primary/80">শিক্ষার্থী ড্যাশবোর্ড</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">
            স্বাগতম, {profile?.full_name || "শিক্ষার্থী"}!
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">আজকের প্রস্তুতি শুরু করুন - এক্সাম, রেজাল্ট, র‌্যাঙ্কিং সব এক জায়গায়।</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link to={c.link} key={c.title} className="group block">
            <Card className="relative h-full overflow-hidden border-border/70 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/10">
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${c.glow} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
              <CardHeader className="relative flex flex-row items-start justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-bold">{c.title}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">{c.desc}</p>
                </div>
                <div className={`rounded-xl p-2.5 ${c.iconWrap}`}>
                  <c.icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="relative flex items-center justify-between pt-0">
                <span className="text-xs font-medium text-muted-foreground">বিস্তারিত দেখুন</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
