import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Clock, FileText, PlayCircle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Exam = Pick<
  Tables<"exams">,
  "id" | "title" | "description" | "total_questions" | "duration_minutes" | "pass_mark" | "max_attempts" | "reward_coins"
>;
type AttemptExamId = Pick<Tables<"attempts">, "exam_id">;
type AccountStatus = "active" | "suspended" | "deleted";

export default function LiveExams() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [attemptCounts, setAttemptCounts] = useState<Record<string, number>>({});
  const [accountStatus, setAccountStatus] = useState<AccountStatus>("active");
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await supabase.from("exams").select("*").eq("status", "live");
        setExams(data || []);

        if (user && data) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("account_status")
            .eq("user_id", user.id)
            .maybeSingle();

          const status = profile?.account_status;
          if (status === "suspended" || status === "deleted") setAccountStatus(status);
          else setAccountStatus("active");

          const { data: attempts } = await supabase
            .from("attempts")
            .select("exam_id")
            .eq("user_id", user.id)
            .not("submitted_at", "is", null);

          const counts: Record<string, number> = {};
          const typedAttempts = (attempts || []) as AttemptExamId[];
          typedAttempts.forEach((a) => {
            counts[a.exam_id] = (counts[a.exam_id] || 0) + 1;
          });
          setAttemptCounts(counts);
        } else {
          setAttemptCounts({});
        }
      } finally {
        setLoading(false);
      }
    };

    void fetch();
  }, [user]);

  const startExam = async (exam: Exam) => {
    if (!user) return;

    if (accountStatus === "suspended") {
      toast({
        title: "আপনার একাউন্ট সাসপেন্ড",
        description: "বর্তমানে আপনি পরীক্ষা দিতে পারবেন না।",
        variant: "destructive",
      });
      return;
    }

    if (accountStatus === "deleted") {
      toast({
        title: "আপনার একাউন্ট ডিলেটেড",
        description: "পরীক্ষা দেওয়া বর্তমানে সম্ভব নয়।",
        variant: "destructive",
      });
      return;
    }

    const used = attemptCounts[exam.id] || 0;
    if (used >= exam.max_attempts) {
      toast({ title: "সর্বোচ্চ Attempt শেষ", variant: "destructive" });
      return;
    }

    const { data: existing } = await supabase
      .from("attempts")
      .select("id")
      .eq("exam_id", exam.id)
      .eq("user_id", user.id)
      .is("submitted_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      navigate(`/student/exam/${existing.id}`);
      return;
    }

    const { data: attempt, error } = await supabase
      .from("attempts")
      .insert({ exam_id: exam.id, user_id: user.id })
      .select()
      .single();

    if (error || !attempt) {
      toast({ title: "পরীক্ষা শুরু করা যায়নি", description: error?.message, variant: "destructive" });
      return;
    }

    navigate(`/student/exam/${attempt.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">লাইভ পরীক্ষাসমূহ</h1>

      {accountStatus === "suspended" && (
        <Card className="mb-4 border-destructive/30 bg-destructive/5">
          <CardContent className="py-3 text-sm text-destructive">
            আপনার একাউন্ট সাসপেন্ড করা হয়েছে, তাই আপনি বর্তমানে কোনো পরীক্ষা দিতে পারবেন না।
          </CardContent>
        </Card>
      )}

      {accountStatus === "deleted" && (
        <Card className="mb-4 border-destructive/30 bg-destructive/5">
          <CardContent className="py-3 text-sm text-destructive">
            আপনার একাউন্ট ডিলেটেড, তাই পরীক্ষা দেওয়া সম্ভব নয়।
          </CardContent>
        </Card>
      )}

      {exams.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">বর্তমানে কোনো লাইভ পরীক্ষা নেই</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exams.map((e) => {
            const used = attemptCounts[e.id] || 0;
            const canAttempt = used < e.max_attempts;
            const accountBlocked = accountStatus !== "active";

            return (
              <Card key={e.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">{e.title}</CardTitle>
                  {e.description && <CardDescription>{e.description}</CardDescription>}
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      {e.total_questions} প্রশ্ন
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {e.duration_minutes} মিনিট
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">পাসমার্ক: {e.pass_mark}%</Badge>
                    {e.reward_coins > 0 && <Badge variant="secondary">🪙 {e.reward_coins} কয়েন</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">Attempt: {used}/{e.max_attempts}</p>
                  <Button className="w-full" disabled={!canAttempt || accountBlocked} onClick={() => void startExam(e)}>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    {accountBlocked ? "অ্যাকাউন্ট সীমাবদ্ধ" : canAttempt ? "পরীক্ষা শুরু করুন" : "Attempt শেষ"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
