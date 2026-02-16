import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Clock, FileText, PlayCircle } from "lucide-react";

interface Exam {
  id: string;
  title: string;
  description: string | null;
  total_questions: number;
  duration_minutes: number;
  pass_mark: number;
  max_attempts: number;
  reward_coins: number;
}

export default function LiveExams() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [attemptCounts, setAttemptCounts] = useState<Record<string, number>>({});
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("exams").select("*").eq("status", "live");
      setExams((data || []) as any);

      if (user && data) {
        const { data: attempts } = await supabase
          .from("attempts")
          .select("exam_id")
          .eq("user_id", user.id)
          .not("submitted_at", "is", null);
        const counts: Record<string, number> = {};
        (attempts || []).forEach((a: any) => { counts[a.exam_id] = (counts[a.exam_id] || 0) + 1; });
        setAttemptCounts(counts);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const startExam = async (exam: Exam) => {
    if (!user) return;
    const used = attemptCounts[exam.id] || 0;
    if (used >= exam.max_attempts) {
      toast({ title: "সর্বোচ্চ Attempt শেষ", variant: "destructive" }); return;
    }

    // Check for existing unfinished attempt
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
      toast({ title: "পরিক্ষা শুরু করা যায়নি", description: error?.message, variant: "destructive" }); return;
    }
    navigate(`/student/exam/${(attempt as any).id}`);
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
      <h1 className="mb-6 text-2xl font-bold">লাইভ পরিক্ষাসমূহ</h1>
      {exams.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">বর্তমানে কোনো লাইভ পরিক্ষা নেই</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exams.map(e => {
            const used = attemptCounts[e.id] || 0;
            const canAttempt = used < e.max_attempts;
            return (
              <Card key={e.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">{e.title}</CardTitle>
                  {e.description && <CardDescription>{e.description}</CardDescription>}
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{e.total_questions} প্রশ্ন</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{e.duration_minutes} মিনিট</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">পাসমার্ক: {e.pass_mark}%</Badge>
                    {e.reward_coins > 0 && <Badge variant="secondary">🪙 {e.reward_coins} কয়েন</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">Attempt: {used}/{e.max_attempts}</p>
                  <Button className="w-full" disabled={!canAttempt} onClick={() => startExam(e)}>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    {canAttempt ? "পরিক্ষা শুরু করুন" : "Attempt শেষ"}
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
