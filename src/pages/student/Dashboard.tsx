import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Coins, ClipboardList, Trophy } from "lucide-react";
import { Link } from "react-router-dom";

export default function StudentDashboard() {
  const { profile } = useAuth();

  const cards = [
    { title: "লাইভ পরিক্ষা", desc: "চলমান পরিক্ষায় অংশ নিন", icon: BookOpen, link: "/student/exams", color: "text-primary" },
    { title: "আমার পরিক্ষা", desc: "পরিক্ষার ইতিহাস দেখুন", icon: ClipboardList, link: "/student/my-exams", color: "text-primary" },
    { title: "লিডারবোর্ড", desc: "র‍্যাঙ্কিং দেখুন", icon: Trophy, link: "/student/leaderboard", color: "text-accent" },
    { title: "কয়েন ওয়ালেট", desc: `ব্যালেন্স: ${profile?.coin_balance ?? 0} কয়েন`, icon: Coins, link: "/student/wallet", color: "text-accent" },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">স্বাগতম, {profile?.full_name || "পরিক্ষার্থী"}!</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map(c => (
          <Link to={c.link} key={c.title}>
            <Card className="transition-shadow hover:shadow-md cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{c.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
