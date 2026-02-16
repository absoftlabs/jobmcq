import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, MinusCircle, ArrowLeft } from "lucide-react";

interface AnswerDetail {
  question_text: string;
  question_type: string;
  selected_option_ids: string[];
  fill_answer: string | null;
  is_correct: boolean | null;
  explanation: string | null;
  options: { id: string; option_text: string; is_correct: boolean; explanation: string | null }[];
}

export default function ResultReview() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const [attempt, setAttempt] = useState<any>(null);
  const [details, setDetails] = useState<AnswerDetail[]>([]);
  const [filter, setFilter] = useState<"all" | "correct" | "wrong" | "skipped">("all");
  const [loading, setLoading] = useState(true);
  const [examTitle, setExamTitle] = useState("");

  useEffect(() => {
    const fetch = async () => {
      if (!attemptId) return;

      const { data: att } = await supabase.from("attempts").select("*").eq("id", attemptId).single();
      if (!att) return;
      setAttempt(att);

      const { data: exam } = await supabase.from("exams").select("title").eq("id", (att as any).exam_id).single();
      setExamTitle((exam as any)?.title || "");

      const { data: eqs } = await supabase
        .from("exam_questions")
        .select("question_id, sort_order")
        .eq("exam_id", (att as any).exam_id)
        .order("sort_order");

      const qIds = (eqs || []).map((eq: any) => eq.question_id);

      const [{ data: qs }, { data: opts }, { data: ans }] = await Promise.all([
        supabase.from("questions").select("*").in("id", qIds),
        supabase.from("question_options").select("*").in("question_id", qIds).order("sort_order"),
        supabase.from("attempt_answers").select("*").eq("attempt_id", attemptId),
      ]);

      const qMap = new Map((qs || []).map((q: any) => [q.id, q]));
      const optMap = new Map<string, any[]>();
      (opts || []).forEach((o: any) => {
        const arr = optMap.get(o.question_id) || [];
        arr.push(o);
        optMap.set(o.question_id, arr);
      });
      const ansMap = new Map((ans || []).map((a: any) => [a.question_id, a]));

      const result: AnswerDetail[] = qIds.map(id => {
        const q = qMap.get(id) || {};
        const a = ansMap.get(id) || {};
        return {
          question_text: q.question_text || "",
          question_type: q.question_type || "mcq",
          selected_option_ids: a.selected_option_ids || [],
          fill_answer: a.fill_answer || null,
          is_correct: a.is_correct ?? null,
          explanation: q.explanation || null,
          options: (optMap.get(id) || []).map((o: any) => ({
            id: o.id, option_text: o.option_text, is_correct: o.is_correct, explanation: o.explanation,
          })),
        };
      });

      setDetails(result);
      setLoading(false);
    };
    fetch();
  }, [attemptId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const filtered = details.filter(d => {
    if (filter === "correct") return d.is_correct === true;
    if (filter === "wrong") return d.is_correct === false && (d.selected_option_ids.length > 0 || d.fill_answer);
    if (filter === "skipped") return d.is_correct === null || (d.selected_option_ids.length === 0 && !d.fill_answer);
    return true;
  });

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/student/my-exams">
        <Button variant="ghost" size="sm" className="mb-4"><ArrowLeft className="mr-1 h-4 w-4" /> ফিরে যান</Button>
      </Link>

      <h1 className="mb-2 text-2xl font-bold">{examTitle} — ফলাফল</h1>

      {attempt && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{Number(attempt.score).toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">স্কোর</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-accent">{attempt.total_correct}</p>
              <p className="text-xs text-muted-foreground">সঠিক</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-destructive">{attempt.total_wrong}</p>
              <p className="text-xs text-muted-foreground">ভুল</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-muted-foreground">{attempt.total_skipped}</p>
              <p className="text-xs text-muted-foreground">স্কিপ</p>
            </CardContent>
          </Card>
        </div>
      )}

      {attempt && (
        <div className="mb-6">
          <Badge variant={attempt.is_passed ? "default" : "destructive"} className="text-base px-4 py-1">
            {attempt.is_passed ? "✅ পাস" : "❌ ফেল"}
          </Badge>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex gap-2">
        {(["all", "correct", "wrong", "skipped"] as const).map(f => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
            {{ all: "সব", correct: "সঠিক", wrong: "ভুল", skipped: "স্কিপ" }[f]}
          </Button>
        ))}
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {filtered.map((d, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex items-start gap-2">
                {d.is_correct === true && <CheckCircle className="mt-0.5 h-5 w-5 text-accent shrink-0" />}
                {d.is_correct === false && <XCircle className="mt-0.5 h-5 w-5 text-destructive shrink-0" />}
                {d.is_correct === null && <MinusCircle className="mt-0.5 h-5 w-5 text-muted-foreground shrink-0" />}
                <CardTitle className="text-sm font-medium">{d.question_text}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {d.options.map(opt => {
                const isSelected = d.selected_option_ids.includes(opt.id);
                const bg = opt.is_correct
                  ? "border-green-500 bg-green-50"
                  : isSelected ? "border-destructive bg-red-50" : "";
                return (
                  <div key={opt.id} className={`rounded-lg border p-2.5 text-sm ${bg}`}>
                    <div className="flex items-center justify-between">
                      <span>{opt.option_text}</span>
                      <span className="text-xs">
                        {opt.is_correct && "✅"}
                        {isSelected && !opt.is_correct && "❌"}
                      </span>
                    </div>
                    {opt.explanation && (
                      <p className="mt-1 text-xs text-muted-foreground italic">{opt.explanation}</p>
                    )}
                  </div>
                );
              })}
              {d.fill_answer && (
                <p className="text-sm"><span className="font-medium">আপনার উত্তর:</span> {d.fill_answer}</p>
              )}
              {d.explanation && (
                <div className="mt-2 rounded-lg bg-muted p-3">
                  <p className="text-sm"><span className="font-medium">ব্যাখ্যা:</span> {d.explanation}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
