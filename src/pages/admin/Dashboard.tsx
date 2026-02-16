import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, PlayCircle, ClipboardCheck, TrendingUp, AlertTriangle } from "lucide-react";

interface Stats {
  totalUsers: number;
  totalExams: number;
  liveExams: number;
  totalAttempts: number;
  passRate: number;
  pendingReports: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, totalExams: 0, liveExams: 0, totalAttempts: 0, passRate: 0, pendingReports: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, examsRes, liveRes, attemptsRes, passedRes, reportsRes] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("exams").select("id", { count: "exact", head: true }),
          supabase.from("exams").select("id", { count: "exact", head: true }).eq("status", "live"),
          supabase.from("attempts").select("id", { count: "exact", head: true }).not("submitted_at", "is", null),
          supabase.from("attempts").select("id", { count: "exact", head: true }).eq("is_passed", true),
          supabase.from("question_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
        ]);

        const totalAttempts = attemptsRes.count ?? 0;
        const passed = passedRes.count ?? 0;

        setStats({
          totalUsers: usersRes.count ?? 0,
          totalExams: examsRes.count ?? 0,
          liveExams: liveRes.count ?? 0,
          totalAttempts,
          passRate: totalAttempts > 0 ? Math.round((passed / totalAttempts) * 100) : 0,
          pendingReports: reportsRes.count ?? 0,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const cards = [
    { title: "মোট পরিক্ষার্থী", value: stats.totalUsers, icon: Users, color: "text-primary" },
    { title: "মোট পরিক্ষা", value: stats.totalExams, icon: FileText, color: "text-primary" },
    { title: "লাইভ পরিক্ষা", value: stats.liveExams, icon: PlayCircle, color: "text-accent" },
    { title: "মোট Attempt", value: stats.totalAttempts, icon: ClipboardCheck, color: "text-primary" },
    { title: "পাসের হার", value: `${stats.passRate}%`, icon: TrendingUp, color: "text-accent" },
    { title: "পেন্ডিং রিপোর্ট", value: stats.pendingReports, icon: AlertTriangle, color: "text-destructive" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">অ্যাডমিন ড্যাশবোর্ড</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title} className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
