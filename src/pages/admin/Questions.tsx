import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit, Trash2, X } from "lucide-react";
import type { Enums, Tables } from "@/integrations/supabase/types";

type QuestionType = Enums<"question_type">;
type DifficultyLevel = Enums<"difficulty_level">;
type QuestionRow = Tables<"questions">;
type QuestionOptionRow = Tables<"question_options">;

interface QuestionOption {
  id?: string;
  option_text: string;
  is_correct: boolean;
  explanation: string;
  sort_order: number;
}

interface Question {
  id: string;
  question_text: string;
  question_type: QuestionType;
  category: string | null;
  topic: string | null;
  difficulty: DifficultyLevel;
  explanation: string | null;
  created_at: string;
  question_options?: QuestionOption[];
}

export default function AdminQuestions() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const { toast } = useToast();

  // Form state
  const [formText, setFormText] = useState("");
  const [formType, setFormType] = useState<QuestionType>("mcq");
  const [formCategory, setFormCategory] = useState("");
  const [formTopic, setFormTopic] = useState("");
  const [formDifficulty, setFormDifficulty] = useState<DifficultyLevel>("medium");
  const [formExplanation, setFormExplanation] = useState("");
  const [formOptions, setFormOptions] = useState<QuestionOption[]>([
    { option_text: "", is_correct: false, explanation: "", sort_order: 0 },
    { option_text: "", is_correct: false, explanation: "", sort_order: 1 },
    { option_text: "", is_correct: false, explanation: "", sort_order: 2 },
    { option_text: "", is_correct: false, explanation: "", sort_order: 3 },
  ]);

  const fetchQuestions = async () => {
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setQuestions(data as QuestionRow[]);
    if (error) toast({ title: "ত্রুটি", description: error.message, variant: "destructive" });
    setLoading(false);
  };

  useEffect(() => { fetchQuestions(); }, []);

  const resetForm = () => {
    setFormText(""); setFormType("mcq"); setFormCategory(""); setFormTopic("");
    setFormDifficulty("medium"); setFormExplanation(""); setEditingQuestion(null);
    setFormOptions([
      { option_text: "", is_correct: false, explanation: "", sort_order: 0 },
      { option_text: "", is_correct: false, explanation: "", sort_order: 1 },
      { option_text: "", is_correct: false, explanation: "", sort_order: 2 },
      { option_text: "", is_correct: false, explanation: "", sort_order: 3 },
    ]);
  };

  const openEdit = async (q: Question) => {
    setEditingQuestion(q);
    setFormText(q.question_text);
    setFormType(q.question_type);
    setFormCategory(q.category || "");
    setFormTopic(q.topic || "");
    setFormDifficulty(q.difficulty);
    setFormExplanation(q.explanation || "");

    const { data: opts } = await supabase
      .from("question_options")
      .select("*")
      .eq("question_id", q.id)
      .order("sort_order");
    if (opts && opts.length > 0) {
      setFormOptions(opts.map((o: QuestionOptionRow) => ({
        id: o.id, option_text: o.option_text, is_correct: o.is_correct,
        explanation: o.explanation || "", sort_order: o.sort_order,
      })));
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formText.trim()) {
      toast({ title: "প্রশ্নের টেক্সট দিন", variant: "destructive" }); return;
    }
    const hasCorrect = formOptions.some(o => o.is_correct);
    if (formType !== "fill_blank" && !hasCorrect) {
      toast({ title: "কমপক্ষে একটি সঠিক উত্তর নির্বাচন করুন", variant: "destructive" }); return;
    }

    if (editingQuestion) {
      const { error } = await supabase.from("questions").update({
        question_text: formText, question_type: formType,
        category: formCategory || null, topic: formTopic || null,
        difficulty: formDifficulty, explanation: formExplanation || null,
      }).eq("id", editingQuestion.id);

      if (error) { toast({ title: "আপডেট ব্যর্থ", description: error.message, variant: "destructive" }); return; }

      // Delete old options and insert new
      await supabase.from("question_options").delete().eq("question_id", editingQuestion.id);
      if (formType !== "fill_blank") {
        const opts = formOptions.filter(o => o.option_text.trim()).map((o, i) => ({
          question_id: editingQuestion.id, option_text: o.option_text,
          is_correct: o.is_correct, explanation: o.explanation || null, sort_order: i,
        }));
        await supabase.from("question_options").insert(opts);
      }
      toast({ title: "প্রশ্ন আপডেট হয়েছে" });
    } else {
      const { data: newQ, error } = await supabase.from("questions").insert({
        question_text: formText, question_type: formType,
        category: formCategory || null, topic: formTopic || null,
        difficulty: formDifficulty, explanation: formExplanation || null,
      }).select().single();

      if (error || !newQ) { toast({ title: "তৈরি ব্যর্থ", description: error?.message, variant: "destructive" }); return; }

      if (formType !== "fill_blank") {
        const opts = formOptions.filter(o => o.option_text.trim()).map((o, i) => ({
          question_id: newQ.id, option_text: o.option_text,
          is_correct: o.is_correct, explanation: o.explanation || null, sort_order: i,
        }));
        await supabase.from("question_options").insert(opts);
      }
      toast({ title: "প্রশ্ন তৈরি হয়েছে" });
    }

    setDialogOpen(false);
    resetForm();
    fetchQuestions();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) toast({ title: "ডিলিট ব্যর্থ", description: error.message, variant: "destructive" });
    else { toast({ title: "প্রশ্ন ডিলিট হয়েছে" }); fetchQuestions(); }
  };

  const addOption = () => {
    setFormOptions([...formOptions, { option_text: "", is_correct: false, explanation: "", sort_order: formOptions.length }]);
  };

  const removeOption = (idx: number) => {
    setFormOptions(formOptions.filter((_, i) => i !== idx));
  };

  const updateOption = <K extends keyof QuestionOption>(idx: number, field: K, value: QuestionOption[K]) => {
    const updated = [...formOptions];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === "is_correct" && value && formType === "mcq") {
      updated.forEach((o, i) => { if (i !== idx) o.is_correct = false; });
    }
    setFormOptions(updated);
  };

  const filtered = questions.filter(q => {
    const matchSearch = q.question_text.toLowerCase().includes(search.toLowerCase()) ||
      (q.category || "").toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || q.question_type === filterType;
    const matchDiff = filterDifficulty === "all" || q.difficulty === filterDifficulty;
    return matchSearch && matchType && matchDiff;
  });

  const difficultyLabel: Record<string, string> = { easy: "সহজ", medium: "মাঝারি", hard: "কঠিন" };
  const typeLabel: Record<string, string> = { mcq: "MCQ", fill_blank: "শূন্যস্থান", multi_select: "মাল্টি সিলেক্ট" };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">প্রশ্ন ব্যাংক</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> নতুন প্রশ্ন</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingQuestion ? "প্রশ্ন এডিট করুন" : "নতুন প্রশ্ন তৈরি করুন"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>প্রশ্ন</Label>
                <Textarea value={formText} onChange={e => setFormText(e.target.value)} placeholder="প্রশ্নটি লিখুন..." rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ধরন</Label>
                  <Select value={formType} onValueChange={setFormType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mcq">MCQ (একটি সঠিক)</SelectItem>
                      <SelectItem value="multi_select">মাল্টি সিলেক্ট</SelectItem>
                      <SelectItem value="fill_blank">শূন্যস্থান পূরণ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>কঠিনতা</Label>
                  <Select value={formDifficulty} onValueChange={setFormDifficulty}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">সহজ</SelectItem>
                      <SelectItem value="medium">মাঝারি</SelectItem>
                      <SelectItem value="hard">কঠিন</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ক্যাটেগরি</Label>
                  <Input value={formCategory} onChange={e => setFormCategory(e.target.value)} placeholder="যেমন: বাংলা, গণিত" />
                </div>
                <div className="space-y-2">
                  <Label>টপিক</Label>
                  <Input value={formTopic} onChange={e => setFormTopic(e.target.value)} placeholder="যেমন: ব্যাকরণ" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>ব্যাখ্যা (সঠিক উত্তরের)</Label>
                <Textarea value={formExplanation} onChange={e => setFormExplanation(e.target.value)} placeholder="উত্তরের ব্যাখ্যা..." rows={2} />
              </div>

              {formType !== "fill_blank" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>অপশনসমূহ</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addOption}>
                      <Plus className="mr-1 h-3 w-3" /> অপশন যোগ
                    </Button>
                  </div>
                  {formOptions.map((opt, idx) => (
                    <div key={idx} className="space-y-2 rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground w-6">
                          {String.fromCharCode(2453 + idx)}.
                        </span>
                        <Input
                          className="flex-1"
                          value={opt.option_text}
                          onChange={e => updateOption(idx, "option_text", e.target.value)}
                          placeholder={`অপশন ${idx + 1}`}
                        />
                        <label className="flex items-center gap-1 text-sm whitespace-nowrap">
                          <input
                            type={formType === "mcq" ? "radio" : "checkbox"}
                            name="correct_option"
                            checked={opt.is_correct}
                            onChange={e => updateOption(idx, "is_correct", e.target.checked)}
                          />
                          সঠিক
                        </label>
                        {formOptions.length > 2 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(idx)}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <Input
                        value={opt.explanation}
                        onChange={e => updateOption(idx, "explanation", e.target.value)}
                        placeholder="এই অপশনের ব্যাখ্যা (ঐচ্ছিক)"
                        className="text-sm"
                      />
                    </div>
                  ))}
                </div>
              )}

              <Button className="w-full" onClick={handleSave}>
                {editingQuestion ? "আপডেট করুন" : "সংরক্ষণ করুন"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="প্রশ্ন বা ক্যাটেগরি খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40"><SelectValue placeholder="ধরন" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সব ধরন</SelectItem>
            <SelectItem value="mcq">MCQ</SelectItem>
            <SelectItem value="multi_select">মাল্টি সিলেক্ট</SelectItem>
            <SelectItem value="fill_blank">শূন্যস্থান</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
          <SelectTrigger className="w-40"><SelectValue placeholder="কঠিনতা" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সব</SelectItem>
            <SelectItem value="easy">সহজ</SelectItem>
            <SelectItem value="medium">মাঝারি</SelectItem>
            <SelectItem value="hard">কঠিন</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">কোনো প্রশ্ন পাওয়া যায়নি</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>প্রশ্ন</TableHead>
                  <TableHead className="w-24">ধরন</TableHead>
                  <TableHead className="w-24">কঠিনতা</TableHead>
                  <TableHead className="w-28">ক্যাটেগরি</TableHead>
                  <TableHead className="w-20">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(q => (
                  <TableRow key={q.id}>
                    <TableCell className="max-w-xs truncate">{q.question_text}</TableCell>
                    <TableCell><Badge variant="secondary">{typeLabel[q.question_type] || q.question_type}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{difficultyLabel[q.difficulty] || q.difficulty}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{q.category || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(q)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(q.id)}>
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
