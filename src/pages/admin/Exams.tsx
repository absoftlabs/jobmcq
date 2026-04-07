import { useRef, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Download, Plus, Edit, Trash2, Eye, Upload } from "lucide-react";
import type { Enums, Tables, TablesInsert } from "@/integrations/supabase/types";
import { withTimeout } from "@/lib/withTimeout";

type Exam = Tables<"exams">;
type ExamStatus = Enums<"exam_status">;
type QuestionType = Enums<"question_type">;
type DifficultyLevel = Enums<"difficulty_level">;
type QuestionSummary = Pick<Tables<"questions">, "id" | "question_text" | "category" | "difficulty">;
type AssignedQuestion = Pick<Tables<"exam_questions">, "question_id">;

interface OptionDraft {
  option_text: string;
  is_correct: boolean;
  explanation: string;
}

const defaultOptions = (): OptionDraft[] => [
  { option_text: "", is_correct: false, explanation: "" },
  { option_text: "", is_correct: false, explanation: "" },
  { option_text: "", is_correct: false, explanation: "" },
  { option_text: "", is_correct: false, explanation: "" },
];

const bulkHeaders = [
  "question_text",
  "question_type",
  "difficulty",
  "category",
  "topic",
  "question_explanation",
  "option_1_text",
  "option_1_correct",
  "option_1_explanation",
  "option_2_text",
  "option_2_correct",
  "option_2_explanation",
  "option_3_text",
  "option_3_correct",
  "option_3_explanation",
  "option_4_text",
  "option_4_correct",
  "option_4_explanation",
] as const;

const normalizeQuestionText = (text: string): string =>
  text
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const toBool = (v: string): boolean => {
  const x = v.trim().toLowerCase();
  return x === "1" || x === "true" || x === "yes" || x === "y";
};

const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === "\"") {
      const next = line[i + 1];
      if (inQuotes && next === "\"") {
        current += "\"";
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

const parseCsv = (text: string): Record<string, string>[] => {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = maybeRepairMojibake((cols[idx] || "").trim());
    });
    return row;
  });
};

const mojibakePattern = /(?:Ã.|à¦|à§|â€™|â€œ|â€|â€“|â€”)/g;

const mojibakeScore = (text: string): number =>
  (text.match(mojibakePattern) || []).length + (text.match(/�/g) || []).length;

const maybeRepairMojibake = (text: string): string => {
  if (!text) return text;
  const before = mojibakeScore(text);
  if (before === 0) return text;
  try {
    const bytes = Uint8Array.from(text, (ch) => ch.charCodeAt(0) & 0xff);
    const repaired = new TextDecoder("utf-8").decode(bytes);
    return mojibakeScore(repaired) < before ? repaired : text;
  } catch {
    return text;
  }
};

const decodeCsvFile = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  const hasUtf8Bom = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  const hasUtf16LeBom = bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe;
  const hasUtf16BeBom = bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff;

  if (hasUtf8Bom) return maybeRepairMojibake(new TextDecoder("utf-8").decode(bytes.slice(3)));
  if (hasUtf16LeBom) return maybeRepairMojibake(new TextDecoder("utf-16le").decode(bytes.slice(2)));
  if (hasUtf16BeBom) return maybeRepairMojibake(new TextDecoder("utf-16be").decode(bytes.slice(2)));

  const candidates: string[] = [];
  try {
    candidates.push(new TextDecoder("utf-8").decode(bytes));
  } catch {
    // try next
  }
  try {
    candidates.push(new TextDecoder("utf-16le").decode(bytes));
  } catch {
    // try next
  }
  try {
    candidates.push(new TextDecoder("utf-16be").decode(bytes));
  } catch {
    // try next
  }
  if (candidates.length === 0) throw new Error("Unable to decode CSV file");

  const scored = candidates
    .map((text) => {
      const repaired = maybeRepairMojibake(text);
      return {
        text: repaired,
        score: mojibakeScore(repaired),
      };
    })
    .sort((a, b) => a.score - b.score);

  return scored[0].text;
};

export default function AdminExams() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Exam | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignExamId, setAssignExamId] = useState<string | null>(null);
  const [allQuestions, setAllQuestions] = useState<QuestionSummary[]>([]);
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [bulkUploading, setBulkUploading] = useState(false);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionType, setNewQuestionType] = useState<QuestionType>("mcq");
  const [newDifficulty, setNewDifficulty] = useState<DifficultyLevel>("medium");
  const [newCategory, setNewCategory] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [newExplanation, setNewExplanation] = useState("");
  const [newOptions, setNewOptions] = useState<OptionDraft[]>(defaultOptions());
  const bulkInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  // Form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ExamStatus>("draft");
  const [totalQuestions, setTotalQuestions] = useState(25);
  const [duration, setDuration] = useState(30);
  const [passMark, setPassMark] = useState(40);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [rewardCoins, setRewardCoins] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [negativeValue, setNegativeValue] = useState(0.25);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const { data, error } = await withTimeout(
        supabase.from("exams").select("*").order("created_at", { ascending: false }),
        12000,
        "এক্সাম লিস্ট লোড হতে টাইমআউট হয়েছে।",
      );
      if (error) throw error;
      setExams(data || []);
    } catch (error) {
      setExams([]);
      toast({
        title: "এক্সাম ডাটা লোড হয়নি",
        description: error instanceof Error ? error.message : "ডাটাবেস কানেকশন বা query সমস্যা হয়েছে।",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchExams(); }, []);

  const resetForm = () => {
    setTitle(""); setDescription(""); setStatus("draft"); setTotalQuestions(25);
    setDuration(30); setPassMark(40); setMaxAttempts(1); setRewardCoins(0);
    setShuffle(false); setNegativeMarking(false); setNegativeValue(0.25); setEditing(null);
  };

  const resetNewQuestionForm = () => {
    setNewQuestionText("");
    setNewQuestionType("mcq");
    setNewDifficulty("medium");
    setNewCategory("");
    setNewTopic("");
    setNewExplanation("");
    setNewOptions(defaultOptions());
  };

  const openEdit = (e: Exam) => {
    setEditing(e); setTitle(e.title); setDescription(e.description || "");
    setStatus(e.status); setTotalQuestions(e.total_questions); setDuration(e.duration_minutes);
    setPassMark(e.pass_mark); setMaxAttempts(e.max_attempts); setRewardCoins(e.reward_coins);
    setShuffle(e.shuffle_options); setNegativeMarking(e.negative_marking);
    setNegativeValue(Number(e.negative_mark_value)); setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim()) { toast({ title: "শিরোনাম দিন", variant: "destructive" }); return; }
    const payload: TablesInsert<"exams"> = {
      title, description: description || null, status,
      total_questions: totalQuestions, duration_minutes: duration, pass_mark: passMark,
      max_attempts: maxAttempts, reward_coins: rewardCoins, shuffle_options: shuffle,
      negative_marking: negativeMarking, negative_mark_value: negativeValue,
    };

    if (editing) {
      const { error } = await supabase.from("exams").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "আপডেট ব্যর্থ", description: error.message, variant: "destructive" }); return; }
      toast({ title: "এক্সাম আপডেট হয়েছে" });
    } else {
      const { error } = await supabase.from("exams").insert(payload);
      if (error) { toast({ title: "তৈরি ব্যর্থ", description: error.message, variant: "destructive" }); return; }
      toast({ title: "এক্সাম তৈরি হয়েছে" });
    }
    setDialogOpen(false); resetForm(); void fetchExams();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("exams").delete().eq("id", id);
    toast({ title: "এক্সাম ডিলিট হয়েছে" }); void fetchExams();
  };

  const openAssign = async (examId: string) => {
    setAssignExamId(examId);
    try {
      const [{ data: qs, error: qsError }, { data: assigned, error: assignedError }] = await Promise.all([
        withTimeout(
          supabase.from("questions").select("id, question_text, category, difficulty"),
          12000,
          "প্রশ্ন লিস্ট লোড হতে টাইমআউট হয়েছে।",
        ),
        withTimeout(
          supabase.from("exam_questions").select("question_id").eq("exam_id", examId),
          12000,
          "Assigned question লোড হতে টাইমআউট হয়েছে।",
        ),
      ]);
      if (qsError) throw qsError;
      if (assignedError) throw assignedError;
      setAllQuestions(qs || []);
      const typedAssigned = (assigned || []) as AssignedQuestion[];
      setAssignedIds(new Set(typedAssigned.map((a) => a.question_id)));
      resetNewQuestionForm();
      setAssignDialogOpen(true);
    } catch (error) {
      toast({
        title: "এক্সাম প্রশ্ন লোড হয়নি",
        description: error instanceof Error ? error.message : "ডাটাবেস কানেকশন বা query সমস্যা হয়েছে।",
        variant: "destructive",
      });
    }
  };

  const buildQuestionMap = () => {
    const map = new Map<string, string>();
    allQuestions.forEach((q) => map.set(normalizeQuestionText(q.question_text), q.id));
    return map;
  };

  const assignQuestionToExam = async (examId: string, questionId: string, assignedSet: Set<string>) => {
    if (assignedSet.has(questionId)) return false;
    const { error } = await supabase
      .from("exam_questions")
      .insert({ exam_id: examId, question_id: questionId, sort_order: assignedSet.size });
    if (error) throw new Error(error.message);
    assignedSet.add(questionId);
    return true;
  };

  const createOrReuseQuestion = async (
    input: {
      question_text: string;
      question_type: QuestionType;
      difficulty: DifficultyLevel;
      category: string | null;
      topic: string | null;
      explanation: string | null;
      options: OptionDraft[];
    },
    questionMap: Map<string, string>,
  ): Promise<{ questionId: string; created: boolean }> => {
    const normalized = normalizeQuestionText(input.question_text);
    const existing = questionMap.get(normalized);
    if (existing) return { questionId: existing, created: false };

    const { data: q, error: qErr } = await supabase
      .from("questions")
      .insert({
        question_text: input.question_text,
        question_type: input.question_type,
        difficulty: input.difficulty,
        category: input.category,
        topic: input.topic,
        explanation: input.explanation,
      })
      .select("id")
      .single();

    if (qErr || !q) throw new Error(qErr?.message || "প্রশ্ন তৈরি ব্যর্থ");

    if (input.question_type !== "fill_blank") {
      const options = input.options
        .filter((o) => o.option_text.trim())
        .map((o, i) => ({
          question_id: q.id,
          option_text: o.option_text.trim(),
          is_correct: o.is_correct,
          explanation: o.explanation.trim() || null,
          sort_order: i,
        }));

      if (options.length < 2) throw new Error("কমপক্ষে ২টি অপশন দিন");
      if (!options.some((o) => o.is_correct)) throw new Error("কমপক্ষে ১টি সঠিক অপশন দিন");

      const { error: optErr } = await supabase.from("question_options").insert(options);
      if (optErr) throw new Error(optErr.message);
    }

    questionMap.set(normalized, q.id);
    setAllQuestions((prev) => [
      { id: q.id, question_text: input.question_text, category: input.category, difficulty: input.difficulty },
      ...prev,
    ]);
    return { questionId: q.id, created: true };
  };

  const handleAddQuestionInsideExam = async () => {
    if (!assignExamId) return;
    if (!newQuestionText.trim()) {
      toast({ title: "প্রশ্ন লিখুন", variant: "destructive" });
      return;
    }

    setAddingQuestion(true);
    const questionMap = buildQuestionMap();
    const assignedSet = new Set(assignedIds);
    try {
      const { questionId, created } = await createOrReuseQuestion(
        {
          question_text: newQuestionText.trim(),
          question_type: newQuestionType,
          difficulty: newDifficulty,
          category: newCategory.trim() || null,
          topic: newTopic.trim() || null,
          explanation: newExplanation.trim() || null,
          options: newOptions,
        },
        questionMap,
      );

      const assignedNow = await assignQuestionToExam(assignExamId, questionId, assignedSet);
      setAssignedIds(new Set(assignedSet));
      if (created && assignedNow) toast({ title: "নতুন প্রশ্ন প্রশ্ন ব্যাংকে ও এক্সামে যোগ হয়েছে" });
      else if (!created && assignedNow) toast({ title: "ডুপ্লিকেট প্রশ্ন পাওয়া গেছে, বিদ্যমান প্রশ্ন এক্সামে যোগ হয়েছে" });
      else toast({ title: "এই প্রশ্নটি এক্সামে আগে থেকেই আছে" });
      resetNewQuestionForm();
    } catch (e) {
      toast({ title: "প্রশ্ন যোগ করা যায়নি", description: e instanceof Error ? e.message : "অজানা ত্রুটি", variant: "destructive" });
    } finally {
      setAddingQuestion(false);
    }
  };

  const downloadBulkTemplate = () => {
    const example = [
      "বাংলা ব্যাকরণে উপসর্গ কত প্রকার?",
      "mcq",
      "easy",
      "বাংলা",
      "ব্যাকরণ",
      "উপসর্গ সাধারণত ২০টি ধরা হয়।",
      "১০",
      "false",
      "",
      "১৫",
      "false",
      "",
      "২০",
      "true",
      "সঠিক উত্তর",
      "২৫",
      "false",
      "",
    ];
    const esc = (v: string) => `\"${v.replace(/\"/g, "\"\"")}\"`;
    const csv = "\uFEFF" + [bulkHeaders.join(","), example.map(esc).join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "exam-question-bulk-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkUploadInsideExam = async (file: File) => {
    if (!assignExamId) return;
    setBulkUploading(true);
    try {
      const text = await decodeCsvFile(file);
      const rows = parseCsv(text);
      if (rows.length === 0) {
        toast({ title: "ফাইল খালি বা ভুল ফরম্যাট", variant: "destructive" });
        return;
      }

      const required = ["question_text", "question_type", "difficulty"] as const;
      const missing = required.filter((h) => !(h in rows[0]));
      if (missing.length > 0) {
        toast({ title: "প্রয়োজনীয় হেডার পাওয়া যায়নি", description: `অনুপস্থিত: ${missing.join(", ")}`, variant: "destructive" });
        return;
      }

      const questionMap = buildQuestionMap();
      const assignedSet = new Set(assignedIds);
      let created = 0;
      let reused = 0;
      let assigned = 0;
      let failed = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const questionType = (row.question_type || "mcq").trim() as QuestionType;
          const difficulty = (row.difficulty || "medium").trim() as DifficultyLevel;
          if (!["mcq", "multi_select", "fill_blank"].includes(questionType)) throw new Error("question_type invalid");
          if (!["easy", "medium", "hard"].includes(difficulty)) throw new Error("difficulty invalid");
          const options: OptionDraft[] = [];
          for (let n = 1; n <= 4; n++) {
            const optionText = (row[`option_${n}_text`] || "").trim();
            if (!optionText) continue;
            options.push({
              option_text: optionText,
              is_correct: toBool(row[`option_${n}_correct`] || ""),
              explanation: (row[`option_${n}_explanation`] || "").trim(),
            });
          }

          const { questionId, created: isCreated } = await createOrReuseQuestion(
            {
              question_text: (row.question_text || "").trim(),
              question_type: questionType,
              difficulty,
              category: (row.category || "").trim() || null,
              topic: (row.topic || "").trim() || null,
              explanation: (row.question_explanation || "").trim() || null,
              options,
            },
            questionMap,
          );
          if (isCreated) created++;
          else reused++;
          const assignedNow = await assignQuestionToExam(assignExamId, questionId, assignedSet);
          if (assignedNow) assigned++;
        } catch {
          failed++;
        }
      }

      setAssignedIds(new Set(assignedSet));
      toast({
        title: "বাল্ক আপলোড সম্পন্ন",
        description: `নতুন: ${created}, ডুপ্লিকেট রিইউজ: ${reused}, এক্সামে যোগ: ${assigned}, ব্যর্থ: ${failed}`,
        variant: failed > 0 ? "destructive" : "default",
      });
      if (bulkInputRef.current) bulkInputRef.current.value = "";
    } finally {
      setBulkUploading(false);
    }
  };

  const toggleAssign = async (questionId: string) => {
    if (!assignExamId) return;
    const newSet = new Set(assignedIds);
    if (newSet.has(questionId)) {
      await supabase.from("exam_questions").delete().eq("exam_id", assignExamId).eq("question_id", questionId);
      newSet.delete(questionId);
    } else {
      await supabase.from("exam_questions").insert({ exam_id: assignExamId, question_id: questionId, sort_order: newSet.size });
      newSet.add(questionId);
    }
    setAssignedIds(newSet);
  };

  const statusLabel: Record<ExamStatus, string> = { draft: "ড্রাফট", scheduled: "নির্ধারিত", live: "লাইভ", ended: "শেষ" };
  const statusColor: Record<ExamStatus, "default" | "secondary" | "destructive" | "outline"> = {
    draft: "secondary", scheduled: "outline", live: "default", ended: "destructive",
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">এক্সাম ম্যানেজমেন্ট</h1>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> নতুন এক্সাম</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "এক্সাম এডিট" : "নতুন এক্সাম তৈরি"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>শিরোনাম</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="পরিক্ষার শিরোনাম" />
              </div>
              <div className="space-y-2">
                <Label>বিবরণ</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="পরিক্ষার বিবরণ" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>স্ট্যাটাস</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as "draft" | "scheduled" | "live" | "ended")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">ড্রাফট</SelectItem>
                      <SelectItem value="scheduled">নির্ধারিত</SelectItem>
                      <SelectItem value="live">লাইভ</SelectItem>
                      <SelectItem value="ended">শেষ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>প্রশ্ন সংখ্যা</Label>
                  <Select value={String(totalQuestions)} onValueChange={v => setTotalQuestions(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">২৫</SelectItem>
                      <SelectItem value="50">৫০</SelectItem>
                      <SelectItem value="100">১০০</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>সময় (মিনিট)</Label>
                  <Input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>পাসমার্ক (%)</Label>
                  <Input type="number" value={passMark} onChange={e => setPassMark(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Max Attempts</Label>
                  <Input type="number" value={maxAttempts} onChange={e => setMaxAttempts(Number(e.target.value))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>রিওয়ার্ড কয়েন</Label>
                <Input type="number" value={rewardCoins} onChange={e => setRewardCoins(Number(e.target.value))} />
              </div>
              <div className="flex items-center justify-between">
                <Label>অপশন শাফেল</Label>
                <Switch checked={shuffle} onCheckedChange={setShuffle} />
              </div>
              <div className="flex items-center justify-between">
                <Label>নেগেটিভ মার্কিং</Label>
                <Switch checked={negativeMarking} onCheckedChange={setNegativeMarking} />
              </div>
              {negativeMarking && (
                <div className="space-y-2">
                  <Label>নেগেটিভ মার্ক (প্রতি ভুলে)</Label>
                  <Input type="number" step="0.01" value={negativeValue} onChange={e => setNegativeValue(Number(e.target.value))} />
                </div>
              )}
              <Button className="w-full" onClick={handleSave}>
                {editing ? "আপডেট করুন" : "সংরক্ষণ করুন"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Assign questions dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>প্রশ্ন অ্যাসাইন করুন ({assignedIds.size} টি নির্বাচিত)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <input
                ref={bulkInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleBulkUploadInsideExam(file);
                }}
              />
              <Button type="button" variant="outline" onClick={downloadBulkTemplate}>
                <Download className="mr-2 h-4 w-4" /> CSV Template
              </Button>
              <Button type="button" variant="outline" disabled={bulkUploading} onClick={() => bulkInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" /> {bulkUploading ? "Uploading..." : "Upload CSV"}
              </Button>
            </div>

            <Card className="border-dashed">
              <CardContent className="p-3 text-xs text-muted-foreground">
                Template Header: <code>question_text, question_type, difficulty, category, topic, question_explanation, option_1_text, option_1_correct ... option_4_explanation</code>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 p-4">
                <p className="text-sm font-semibold">Add New Question Inside This Exam</p>
                <Textarea value={newQuestionText} onChange={(e) => setNewQuestionText(e.target.value)} rows={3} placeholder="Write question..." />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Select value={newQuestionType} onValueChange={(v) => setNewQuestionType(v as QuestionType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mcq">MCQ</SelectItem>
                      <SelectItem value="multi_select">Multi Select</SelectItem>
                      <SelectItem value="fill_blank">Fill Blank</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={newDifficulty} onValueChange={(v) => setNewDifficulty(v as DifficultyLevel)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Category" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input value={newTopic} onChange={(e) => setNewTopic(e.target.value)} placeholder="Topic" />
                  <Input value={newExplanation} onChange={(e) => setNewExplanation(e.target.value)} placeholder="Question explanation" />
                </div>
                {newQuestionType !== "fill_blank" && (
                  <div className="space-y-2">
                    {newOptions.map((opt, idx) => (
                      <div key={idx} className="rounded-md border p-2">
                        <div className="flex items-center gap-2">
                          <Input
                            value={opt.option_text}
                            onChange={(e) => {
                              const updated = [...newOptions];
                              updated[idx] = { ...updated[idx], option_text: e.target.value };
                              setNewOptions(updated);
                            }}
                            placeholder={`Option ${idx + 1}`}
                          />
                          <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                            <input
                              type={newQuestionType === "mcq" ? "radio" : "checkbox"}
                              checked={opt.is_correct}
                              onChange={(e) => {
                                const updated = [...newOptions];
                                updated[idx] = { ...updated[idx], is_correct: e.target.checked };
                                if (newQuestionType === "mcq" && e.target.checked) {
                                  updated.forEach((o, i) => { if (i !== idx) o.is_correct = false; });
                                }
                                setNewOptions(updated);
                              }}
                            />
                            Correct
                          </label>
                        </div>
                        <Input
                          className="mt-2"
                          value={opt.explanation}
                          onChange={(e) => {
                            const updated = [...newOptions];
                            updated[idx] = { ...updated[idx], explanation: e.target.value };
                            setNewOptions(updated);
                          }}
                          placeholder="Option explanation"
                        />
                      </div>
                    ))}
                  </div>
                )}
                <Button onClick={handleAddQuestionInsideExam} disabled={addingQuestion}>
                  <Plus className="mr-2 h-4 w-4" /> {addingQuestion ? "Adding..." : "Add Question"}
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-2">
              {allQuestions.map(q => (
                <div key={q.id} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50">
                  <input type="checkbox" checked={assignedIds.has(q.id)} onChange={() => toggleAssign(q.id)} />
                  <div className="flex-1">
                    <p className="text-sm">{q.question_text}</p>
                    <p className="text-xs text-muted-foreground">{q.category} • {q.difficulty}</p>
                  </div>
                </div>
              ))}
              {allQuestions.length === 0 && <p className="py-4 text-center text-muted-foreground">No questions in bank</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : exams.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">কোনো এক্সাম তৈরি হয়নি</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>শিরোনাম</TableHead>
                  <TableHead className="w-24">স্ট্যাটাস</TableHead>
                  <TableHead className="w-20">প্রশ্ন</TableHead>
                  <TableHead className="w-24">সময়</TableHead>
                  <TableHead className="w-28">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.title}</TableCell>
                    <TableCell><Badge variant={statusColor[e.status]}>{statusLabel[e.status]}</Badge></TableCell>
                    <TableCell>{e.total_questions}</TableCell>
                    <TableCell>{e.duration_minutes} মিনিট</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openAssign(e.id)} title="প্রশ্ন অ্যাসাইন">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(e)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

