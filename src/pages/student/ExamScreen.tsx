import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Flag, ChevronLeft, ChevronRight, Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Enums, Tables, TablesInsert } from "@/integrations/supabase/types";

interface Question {
  id: string;
  question_text: string;
  question_type: Enums<"question_type">;
  options: { id: string; option_text: string; sort_order: number }[];
}

type AttemptRow = Tables<"attempts">;
type ExamRow = Tables<"exams">;
type ExamQuestionRow = Pick<Tables<"exam_questions">, "question_id">;
type QuestionRow = Pick<Tables<"questions">, "id" | "question_text" | "question_type">;
type QuestionOptionRow = Pick<Tables<"question_options">, "id" | "question_id" | "option_text" | "sort_order" | "is_correct">;
type AttemptAnswerRow = Tables<"attempt_answers">;
type AttemptExamId = Pick<Tables<"attempts">, "exam_id">;
type ExamPassMark = Pick<Tables<"exams">, "pass_mark">;

export default function ExamScreen() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [fillAnswers, setFillAnswers] = useState<Record<string, string>>({});
  const [examTitle, setExamTitle] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [startedAt, setStartedAt] = useState<Date>(new Date());
  const [timeLeft, setTimeLeft] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState("wrong_answer");
  const [reportMessage, setReportMessage] = useState("");
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetch = async () => {
      if (!attemptId) return;

      const { data: attempt } = await supabase
        .from("attempts")
        .select("*")
        .eq("id", attemptId)
        .single();

      if (!attempt || attempt.submitted_at) {
        navigate(`/student/result/${attemptId}`);
        return;
      }

      const examId = attempt.exam_id;
      setStartedAt(new Date(attempt.started_at));

      const { data: exam } = await supabase.from("exams").select("*").eq("id", examId).single();
      const typedExam = exam as ExamRow | null;
      const shouldShuffle = Boolean(typedExam?.shuffle_options);
      if (typedExam) {
        setExamTitle(typedExam.title);
        setDurationMinutes(typedExam.duration_minutes);
        setShuffleOptions(shouldShuffle);
      }

      const { data: eqs } = await supabase
        .from("exam_questions")
        .select("question_id, sort_order")
        .eq("exam_id", examId)
        .order("sort_order");

      const qIds = ((eqs || []) as ExamQuestionRow[]).map((eq) => eq.question_id);
      const { data: qs } = await supabase.from("questions").select("id, question_text, question_type").in("id", qIds);
      const { data: opts } = await supabase.from("question_options").select("id, question_id, option_text, sort_order").in("question_id", qIds).order("sort_order");

      const qMap = new Map(((qs || []) as QuestionRow[]).map((q) => [q.id, q]));
      const optMap = new Map<string, QuestionOptionRow[]>();
      ((opts || []) as QuestionOptionRow[]).forEach((o) => {
        const arr = optMap.get(o.question_id) || [];
        arr.push(o);
        optMap.set(o.question_id, arr);
      });

      const ordered: Question[] = qIds.map(id => {
        const q = qMap.get(id);
        let qOpts = optMap.get(id) || [];
        if (shouldShuffle) qOpts = [...qOpts].sort(() => Math.random() - 0.5);
        return { id, question_text: q?.question_text || "", question_type: q?.question_type || "mcq", options: qOpts };
      });

      setQuestions(ordered);

      // Load saved answers
      const { data: saved } = await supabase.from("attempt_answers").select("*").eq("attempt_id", attemptId);
      const ans: Record<string, string[]> = {};
      const fill: Record<string, string> = {};
      ((saved || []) as AttemptAnswerRow[]).forEach((a) => {
        if (a.selected_option_ids?.length) ans[a.question_id] = a.selected_option_ids;
        if (a.fill_answer) fill[a.question_id] = a.fill_answer;
      });
      setAnswers(ans);
      setFillAnswers(fill);
      setLoading(false);
    };
    fetch();
  }, [attemptId, navigate]);

  // Timer
  useEffect(() => {
    if (loading) return;
    const endTime = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);
    const tick = () => {
      const remaining = Math.max(0, Math.floor((endTime.getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0 && !submitting) handleSubmit();
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [loading, startedAt, durationMinutes, submitting]);

  const saveAnswer = useCallback((qId: string, selectedIds: string[], fillAns?: string) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (!attemptId) return;
      await supabase.from("attempt_answers").upsert({
        attempt_id: attemptId,
        question_id: qId,
        selected_option_ids: selectedIds,
        fill_answer: fillAns || null,
      }, { onConflict: "attempt_id,question_id" });
    }, 500);
  }, [attemptId]);

  const selectOption = (qId: string, optId: string, type: Enums<"question_type">) => {
    const newAns = { ...answers };
    if (type === "mcq") {
      newAns[qId] = [optId];
    } else {
      const current = newAns[qId] || [];
      newAns[qId] = current.includes(optId) ? current.filter(id => id !== optId) : [...current, optId];
    }
    setAnswers(newAns);
    saveAnswer(qId, newAns[qId] || []);
  };

  const updateFill = (qId: string, value: string) => {
    setFillAnswers({ ...fillAnswers, [qId]: value });
    saveAnswer(qId, [], value);
  };

  const handleSubmit = async () => {
    if (!attemptId || submitting) return;
    setSubmitting(true);
    setConfirmOpen(false);

    // Calculate score
    const qIds = questions.map(q => q.id);
    const { data: correctOpts } = await supabase
      .from("question_options")
      .select("question_id, id, is_correct")
      .in("question_id", qIds)
      .eq("is_correct", true);

    const correctMap = new Map<string, Set<string>>();
    ((correctOpts || []) as QuestionOptionRow[]).forEach((o) => {
      const s = correctMap.get(o.question_id) || new Set();
      s.add(o.id);
      correctMap.set(o.question_id, s);
    });

    let correct = 0, wrong = 0, skipped = 0;
    const answerUpdates: TablesInsert<"attempt_answers">[] = [];

    questions.forEach(q => {
      const selected = answers[q.id] || [];
      const correctSet = correctMap.get(q.id) || new Set();

      if (selected.length === 0 && !fillAnswers[q.id]) {
        skipped++;
        answerUpdates.push({ attempt_id: attemptId, question_id: q.id, selected_option_ids: [], is_correct: null });
        return;
      }

      const isCorrect = selected.length === correctSet.size && selected.every(id => correctSet.has(id));
      if (isCorrect) correct++;
      else wrong++;

      answerUpdates.push({
        attempt_id: attemptId, question_id: q.id,
        selected_option_ids: selected, fill_answer: fillAnswers[q.id] || null,
        is_correct: isCorrect,
      });
    });

    for (const a of answerUpdates) {
      await supabase.from("attempt_answers").upsert(a, { onConflict: "attempt_id,question_id" });
    }

    const total = questions.length;
    const score = total > 0 ? (correct / total) * 100 : 0;
    const timeTaken = Math.floor((Date.now() - startedAt.getTime()) / 1000);

    // Get exam pass_mark
    const { data: attempt } = await supabase.from("attempts").select("exam_id").eq("id", attemptId).single();
    const typedAttempt = attempt as AttemptExamId | null;
    const { data: exam } = await supabase.from("exams").select("pass_mark").eq("id", typedAttempt?.exam_id || "").single();
    const typedPass = exam as ExamPassMark | null;
    const isPassed = score >= (typedPass?.pass_mark || 40);

    await supabase.from("attempts").update({
      submitted_at: new Date().toISOString(),
      score, total_correct: correct, total_wrong: wrong, total_skipped: skipped,
      is_passed: isPassed, time_taken_seconds: timeTaken,
    }).eq("id", attemptId);

    navigate(`/student/result/${attemptId}`);
  };

  const handleReport = async () => {
    const q = questions[currentIdx];
    if (!q) return;
    const { error } = await supabase.from("question_reports").insert({
      question_id: q.id,
      reported_by: (await supabase.auth.getUser()).data.user?.id,
      report_type: reportType,
      message: reportMessage || null,
    });
    if (error) toast({ title: "রিপোর্ট ব্যর্থ", variant: "destructive" });
    else toast({ title: "রিপোর্ট পাঠানো হয়েছে" });
    setReportOpen(false);
    setReportMessage("");
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const q = questions[currentIdx];
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const answered = Object.keys(answers).length + Object.keys(fillAnswers).length;
  const progress = questions.length > 0 ? (answered / questions.length) * 100 : 0;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold">{examTitle}</h1>
        <Badge variant={timeLeft < 60 ? "destructive" : "outline"} className="text-base font-mono">
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </Badge>
      </div>
      <Progress value={progress} className="mb-4" />
      <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>প্রশ্ন {currentIdx + 1}/{questions.length}</span>
        <span>{answered} টি উত্তর দেওয়া হয়েছে</span>
      </div>

      {/* Question */}
      {q && (
        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="mb-4 flex items-start justify-between">
              <p className="text-base font-medium flex-1">{q.question_text}</p>
              <Button variant="ghost" size="icon" onClick={() => setReportOpen(true)} title="রিপোর্ট করুন">
                <Flag className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>

            {q.question_type === "fill_blank" ? (
              <Textarea
                value={fillAnswers[q.id] || ""}
                onChange={e => updateFill(q.id, e.target.value)}
                placeholder="আপনার উত্তর লিখুন..."
                rows={3}
              />
            ) : (
              <div className="space-y-2">
                {q.options.map(opt => {
                  const selected = (answers[q.id] || []).includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                        selected ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted/50"
                      }`}
                      onClick={() => selectOption(q.id, opt.id, q.question_type)}
                    >
                      {opt.option_text}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" disabled={currentIdx === 0} onClick={() => setCurrentIdx(i => i - 1)}>
          <ChevronLeft className="mr-1 h-4 w-4" /> পূর্ববর্তী
        </Button>
        {currentIdx < questions.length - 1 ? (
          <Button onClick={() => setCurrentIdx(i => i + 1)}>
            পরবর্তী <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={() => setConfirmOpen(true)}>
            <Send className="mr-1 h-4 w-4" /> সাবমিট করুন
          </Button>
        )}
      </div>

      {/* Question nav dots */}
      <div className="mt-6 flex flex-wrap gap-2 justify-center">
        {questions.map((q, i) => {
          const isAnswered = !!(answers[q.id]?.length || fillAnswers[q.id]);
          return (
            <button
              key={q.id}
              className={`h-8 w-8 rounded-full text-xs font-medium transition-colors ${
                i === currentIdx ? "bg-primary text-primary-foreground" :
                isAnswered ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              }`}
              onClick={() => setCurrentIdx(i)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Submit confirmation */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>পরিক্ষা সাবমিট করুন</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            আপনি কি নিশ্চিত? {questions.length - answered} টি প্রশ্নের উত্তর দেওয়া হয়নি।
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>বাতিল</Button>
            <Button onClick={handleSubmit}>সাবমিট করুন</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>প্রশ্ন রিপোর্ট করুন</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="wrong_answer">ভুল উত্তর</SelectItem>
                <SelectItem value="spelling">বানান ভুল</SelectItem>
                <SelectItem value="info_error">তথ্য ভুল</SelectItem>
                <SelectItem value="missing_option">অপশন কম</SelectItem>
                <SelectItem value="other">অন্যান্য</SelectItem>
              </SelectContent>
            </Select>
            <Textarea value={reportMessage} onChange={e => setReportMessage(e.target.value)} placeholder="বিস্তারিত লিখুন (ঐচ্ছিক)" rows={3} />
            <Button className="w-full" onClick={handleReport}>রিপোর্ট পাঠান</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
