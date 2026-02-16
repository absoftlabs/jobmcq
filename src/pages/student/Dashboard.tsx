import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Coins } from "lucide-react";

export default function StudentDashboard() {
  const { profile } = useAuth();

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold">স্বাগতম, {profile?.full_name || "পরিক্ষার্থী"}!</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">কয়েন ব্যালেন্স</CardTitle>
            <Coins className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{profile?.coin_balance ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">লাইভ পরিক্ষা</CardTitle>
            <BookOpen className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">শীঘ্রই আসছে...</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
