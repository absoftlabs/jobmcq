import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Edit, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Enums, Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { withTimeout } from "@/lib/withTimeout";
import {
  ensureQuestionTaxonomy,
  loadQuestionTaxonomy,
  normalizeName,
  type QuestionCategoryRow,
  type QuestionSubcategoryRow,
} from "@/lib/question-taxonomy";

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

const bulkHeaders = [
  "question_text", "question_type", "difficulty", "category", "subcategory", "question_explanation",
  "option_1_text", "option_1_correct", "option_1_explanation",
  "option_2_text", "option_2_correct", "option_2_explanation",
  "option_3_text", "option_3_correct", "option_3_explanation",
  "option_4_text", "option_4_correct", "option_4_explanation",
] as const;

const makeDefaultOptions = (): QuestionOption[] => [
  { option_text: "", is_correct: false, explanation: "", sort_order: 0 },
  { option_text: "", is_correct: false, explanation: "", sort_order: 1 },
  { option_text: "", is_correct: false, explanation: "", sort_order: 2 },
  { option_text: "", is_correct: false, explanation: "", sort_order: 3 },
];

const difficultyLabel: Record<DifficultyLevel, string> = { easy: "সহজ", medium: "মাঝারি", hard: "কঠিন" };
const typeLabel: Record<QuestionType, string> = { mcq: "MCQ", multi_select: "মাল্টি সিলেক্ট", fill_blank: "শূন্যস্থান" };
const mojibakePattern = /(?:Ãƒ.|Ã Â¦|Ã Â§|Ã¢â‚¬â„¢|Ã¢â‚¬Å“|Ã¢â‚¬Â|Ã¢â‚¬â€œ|Ã¢â‚¬â€)/g;
const mojibakeScore = (text: string) => (text.match(mojibakePattern) || []).length + (text.match(/ï¿½/g) || []).length;
const maybeRepairMojibake = (text: string) => {
  if (!text || mojibakeScore(text) === 0) return text;
  try {
    const bytes = Uint8Array.from(text, (ch) => ch.charCodeAt(0) & 0xff);
    const repaired = new TextDecoder("utf-8").decode(bytes);
    return mojibakeScore(repaired) < mojibakeScore(text) ? repaired : text;
  } catch {
    return text;
  }
};

const parseCsvLine = (line: string) => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === "\"") {
      if (inQuotes && line[i + 1] === "\"") {
        current += "\"";
        i += 1;
      } else inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else current += char;
  }
  result.push(current.trim());
  return result;
};

const parseCsv = (text: string): Record<string, string>[] => {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = maybeRepairMojibake((cols[index] || "").trim());
    });
    return row;
  });
};

const decodeCsvFile = async (file: File) => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const candidates: string[] = [];
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return maybeRepairMojibake(new TextDecoder("utf-8").decode(bytes.slice(3)));
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) return maybeRepairMojibake(new TextDecoder("utf-16le").decode(bytes.slice(2)));
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) return maybeRepairMojibake(new TextDecoder("utf-16be").decode(bytes.slice(2)));
  try { candidates.push(new TextDecoder("utf-8").decode(bytes)); } catch {}
  try { candidates.push(new TextDecoder("utf-16le").decode(bytes)); } catch {}
  try { candidates.push(new TextDecoder("utf-16be").decode(bytes)); } catch {}
  if (candidates.length === 0) throw new Error("ফাইল এনকোডিং পড়া যায়নি");
  return maybeRepairMojibake(candidates.sort((a, b) => mojibakeScore(a) - mojibakeScore(b))[0]);
};

const toBool = (value: string) => ["1", "true", "yes", "y"].includes(value.trim().toLowerCase());

export default function AdminQuestions() {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [categories, setCategories] = useState<QuestionCategoryRow[]>([]);
  const [subcategories, setSubcategories] = useState<QuestionSubcategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionRow | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  const [formText, setFormText] = useState("");
  const [formType, setFormType] = useState<QuestionType>("mcq");
  const [formDifficulty, setFormDifficulty] = useState<DifficultyLevel>("medium");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formSubcategoryId, setFormSubcategoryId] = useState("none");
  const [formExplanation, setFormExplanation] = useState("");
  const [formOptions, setFormOptions] = useState<QuestionOption[]>(makeDefaultOptions);
  const bulkInputRef = useRef<HTMLInputElement | null>(null);

  const fetchPageData = async () => {
    setLoading(true);
    try {
      const [questionRes, taxonomy] = await Promise.all([
        withTimeout(supabase.from("questions").select("*").order("created_at", { ascending: false }), 12000, "প্রশ্ন তালিকা লোড হতে টাইমআউট হয়েছে।"),
        loadQuestionTaxonomy(),
      ]);
      if (questionRes.error) throw questionRes.error;
      setQuestions((questionRes.data || []) as QuestionRow[]);
      setCategories(taxonomy.categories);
      setSubcategories(taxonomy.subcategories);
    } catch (error) {
      toast({ title: "প্রশ্ন ডাটা লোড হয়নি", description: error instanceof Error ? error.message : "অজানা সমস্যা হয়েছে।", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchPageData(); }, []);

  const availableSubcategories = useMemo(() => subcategories.filter((item) => item.category_id === formCategoryId), [formCategoryId, subcategories]);
  const categoryMap = useMemo(() => new Map(categories.map((item) => [item.id, item])), [categories]);
  const subcategoryMap = useMemo(() => new Map(subcategories.map((item) => [item.id, item])), [subcategories]);

  const resetForm = () => {
    setFormText("");
    setFormType("mcq");
    setFormDifficulty("medium");
    setFormCategoryId("");
    setFormSubcategoryId("none");
    setFormExplanation("");
    setFormOptions(makeDefaultOptions());
    setEditingQuestion(null);
  };

  const downloadTemplate = () => {
    const example = [
      "বাংলা ব্যাকরণে উপসর্গ কত প্রকার?", "mcq", "easy", "বাংলা", "ব্যাকরণ", "উপসর্গ সাধারণত ২০টি ধরা হয়।",
      "১০", "false", "", "১৫", "false", "", "২০", "true", "সঠিক উত্তর।", "২৫", "false", "",
    ];
    const escapeCsv = (value: string) => `"${value.replace(/"/g, "\"\"")}"`;
    const csv = `\uFEFF${[bulkHeaders.join(","), example.map(escapeCsv).join(",")].join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "question-bank-bulk-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const openEdit = async (question: QuestionRow) => {
    setEditingQuestion(question);
    setFormText(question.question_text);
    setFormType(question.question_type);
    setFormDifficulty(question.difficulty);
    setFormExplanation(question.explanation || "");
    setFormCategoryId(
      question.category_id ||
      categories.find((item) => item.name.toLowerCase() === (question.category || "").trim().toLowerCase())?.id ||
      "",
    );
    const categoryId = question.category_id ||
      categories.find((item) => item.name.toLowerCase() === (question.category || "").trim().toLowerCase())?.id ||
      "";
    setFormSubcategoryId(
      question.subcategory_id ||
      subcategories.find((item) => item.category_id === categoryId && item.name.toLowerCase() === (question.topic || "").trim().toLowerCase())?.id ||
      "none",
    );
    const { data, error } = await supabase.from("question_options").select("*").eq("question_id", question.id).order("sort_order");
    if (error) {
      toast({ title: "অপশন লোড হয়নি", description: error.message, variant: "destructive" });
      setFormOptions(makeDefaultOptions());
    } else if (data && data.length > 0) {
      setFormOptions((data as QuestionOptionRow[]).map((option) => ({
        id: option.id,
        option_text: option.option_text,
        is_correct: option.is_correct,
        explanation: option.explanation || "",
        sort_order: option.sort_order,
      })));
    } else setFormOptions(makeDefaultOptions());
    setDialogOpen(true);
  };

  const validateOptions = () => {
    const options = formOptions.filter((option) => option.option_text.trim());
    if (formType === "fill_blank") return options;
    if (options.length < 2) throw new Error("কমপক্ষে ২টি অপশন দিন");
    if (!options.some((option) => option.is_correct)) throw new Error("কমপক্ষে ১টি সঠিক উত্তর নির্বাচন করুন");
    return options;
  };

  const handleSave = async () => {
    if (!formText.trim()) return toast({ title: "প্রশ্নের টেক্সট দিন", variant: "destructive" });
    if (!formCategoryId) return toast({ title: "একটি ক্যাটাগরি নির্বাচন করুন", variant: "destructive" });
    try {
      const options = validateOptions();
      const category = categoryMap.get(formCategoryId) || null;
      const subcategory = formSubcategoryId !== "none" ? subcategoryMap.get(formSubcategoryId) || null : null;
      const payload = {
        question_text: formText.trim(),
        question_type: formType,
        difficulty: formDifficulty,
        category_id: category?.id || null,
        subcategory_id: subcategory?.id || null,
        category: category?.name || null,
        topic: subcategory?.name || null,
        explanation: normalizeName(formExplanation) || null,
      };
      if (editingQuestion) {
        const { error } = await supabase.from("questions").update(payload).eq("id", editingQuestion.id);
        if (error) throw error;
        const { error: deleteError } = await supabase.from("question_options").delete().eq("question_id", editingQuestion.id);
        if (deleteError) throw deleteError;
        if (formType !== "fill_blank") {
          const { error: optionError } = await supabase.from("question_options").insert(
            options.map((option, index) => ({
              question_id: editingQuestion.id,
              option_text: option.option_text.trim(),
              is_correct: option.is_correct,
              explanation: normalizeName(option.explanation) || null,
              sort_order: index,
            })),
          );
          if (optionError) throw optionError;
        }
        toast({ title: "প্রশ্ন আপডেট হয়েছে" });
      } else {
        const { data, error } = await supabase.from("questions").insert(payload).select("id").single();
        if (error || !data) throw error || new Error("প্রশ্ন তৈরি ব্যর্থ");
        if (formType !== "fill_blank") {
          const { error: optionError } = await supabase.from("question_options").insert(
            options.map((option, index) => ({
              question_id: data.id,
              option_text: option.option_text.trim(),
              is_correct: option.is_correct,
              explanation: normalizeName(option.explanation) || null,
              sort_order: index,
            })),
          );
          if (optionError) throw optionError;
        }
        toast({ title: "প্রশ্ন তৈরি হয়েছে" });
      }
      setDialogOpen(false);
      resetForm();
      await fetchPageData();
    } catch (error) {
      toast({ title: "সংরক্ষণ ব্যর্থ", description: error instanceof Error ? error.message : "অজানা সমস্যা হয়েছে।", variant: "destructive" });
    }
  };

  const handleDelete = async (questionId: string) => {
    const { error } = await supabase.from("questions").delete().eq("id", questionId);
    if (error) return toast({ title: "ডিলিট ব্যর্থ", description: error.message, variant: "destructive" });
    toast({ title: "প্রশ্ন ডিলিট হয়েছে" });
    await fetchPageData();
  };

  const handleBulkUploadFile = async (file: File) => {
    setBulkUploading(true);
    try {
      const rows = parseCsv(await decodeCsvFile(file));
      if (rows.length === 0) {
        toast({ title: "ফাইল খালি বা ভুল ফরম্যাট", description: "Excel থেকে CSV UTF-8 ফরম্যাটে Save As করে আবার আপলোড করুন।", variant: "destructive" });
        return;
      }
      const missing = ["question_text", "question_type", "difficulty", "category"].filter((header) => !(header in rows[0]));
      if (missing.length > 0) {
        toast({ title: "প্রয়োজনীয় হেডার পাওয়া যায়নি", description: `অনুপস্থিত: ${missing.join(", ")}`, variant: "destructive" });
        return;
      }
      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];
      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        try {
          const questionText = normalizeName(row.question_text || "");
          const questionType = normalizeName(row.question_type || "mcq") as QuestionType;
          const difficulty = normalizeName(row.difficulty || "medium") as DifficultyLevel;
          const categoryName = normalizeName(row.category || "");
          const subcategoryName = normalizeName(row.subcategory || row.topic || "");
          if (!questionText) throw new Error("question_text ফাঁকা");
          if (!["mcq", "multi_select", "fill_blank"].includes(questionType)) throw new Error("question_type invalid");
          if (!["easy", "medium", "hard"].includes(difficulty)) throw new Error("difficulty invalid");
          if (!categoryName) throw new Error("category ফাঁকা");
          const taxonomy = await ensureQuestionTaxonomy(categoryName, subcategoryName || null);
          const { data: created, error: questionError } = await supabase.from("questions").insert({
            question_text: questionText,
            question_type: questionType,
            difficulty,
            category_id: taxonomy.category?.id || null,
            subcategory_id: taxonomy.subcategory?.id || null,
            category: taxonomy.category?.name || null,
            topic: taxonomy.subcategory?.name || null,
            explanation: normalizeName(row.question_explanation || "") || null,
          }).select("id").single();
          if (questionError || !created) throw new Error(questionError?.message || "প্রশ্ন insert ব্যর্থ");
          if (questionType !== "fill_blank") {
            const options: Array<{ question_id: string; option_text: string; is_correct: boolean; explanation: string | null; sort_order: number }> = [];
            for (let number = 1; number <= 4; number += 1) {
              const optionText = normalizeName(row[`option_${number}_text`] || "");
              if (!optionText) continue;
              options.push({
                question_id: created.id,
                option_text: optionText,
                is_correct: toBool(row[`option_${number}_correct`] || ""),
                explanation: normalizeName(row[`option_${number}_explanation`] || "") || null,
                sort_order: options.length,
              });
            }
            if (options.length < 2) throw new Error("কমপক্ষে ২টি অপশন দিন");
            if (!options.some((option) => option.is_correct)) throw new Error("কমপক্ষে ১টি correct option দিন");
            const { error: optionError } = await supabase.from("question_options").insert(options);
            if (optionError) throw new Error(optionError.message);
          }
          successCount += 1;
        } catch (error) {
          failCount += 1;
          errors.push(`সারি ${index + 2}: ${error instanceof Error ? error.message : "অজানা ত্রুটি"}`);
        }
      }
      toast({ title: "বাল্ক আপলোড সম্পন্ন", description: `সফল: ${successCount}, ব্যর্থ: ${failCount}`, variant: failCount > 0 ? "destructive" : "default" });
      if (errors.length > 0) console.error("Bulk upload errors:", errors);
      await fetchPageData();
    } finally {
      setBulkUploading(false);
      if (bulkInputRef.current) bulkInputRef.current.value = "";
    }
  };

  const addOption = () => setFormOptions((current) => [...current, { option_text: "", is_correct: false, explanation: "", sort_order: current.length }]);
  const removeOption = (index: number) => setFormOptions((current) => current.filter((_, itemIndex) => itemIndex !== index));
  const updateOption = <K extends keyof QuestionOption>(index: number, field: K, value: QuestionOption[K]) => {
    setFormOptions((current) => {
      const updated = [...current];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "is_correct" && value && formType === "mcq") updated.forEach((option, itemIndex) => { if (itemIndex !== index) option.is_correct = false; });
      return updated;
    });
  };

  const filteredQuestions = useMemo(() => questions.filter((question) => {
    const query = search.toLowerCase();
    const matchesSearch = question.question_text.toLowerCase().includes(query) || (question.category || "").toLowerCase().includes(query) || (question.topic || "").toLowerCase().includes(query);
    const matchesType = filterType === "all" || question.question_type === filterType;
    const matchesDifficulty = filterDifficulty === "all" || question.difficulty === filterDifficulty;
    return matchesSearch && matchesType && matchesDifficulty;
  }), [filterDifficulty, filterType, questions, search]);

  const stats = useMemo(() => {
    const summary = { total: questions.length, easy: 0, medium: 0, hard: 0 };
    questions.forEach((question) => {
      if (question.difficulty === "easy") summary.easy += 1;
      if (question.difficulty === "medium") summary.medium += 1;
      if (question.difficulty === "hard") summary.hard += 1;
    });
    return summary;
  }, [questions]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">প্রশ্ন ব্যাংক</h1>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={bulkInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleBulkUploadFile(file);
            }}
          />
          <Button type="button" variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" /> টেমপ্লেট ডাউনলোড
          </Button>
          <Button type="button" variant="outline" disabled={bulkUploading} onClick={() => bulkInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> {bulkUploading ? "আপলোড হচ্ছে..." : "বাল্ক আপলোড"}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> নতুন প্রশ্ন</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>{editingQuestion ? "প্রশ্ন এডিট করুন" : "নতুন প্রশ্ন তৈরি করুন"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>প্রশ্ন</Label>
                  <Textarea value={formText} onChange={(event) => setFormText(event.target.value)} placeholder="প্রশ্নটি লিখুন..." rows={3} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>ধরন</Label>
                    <Select value={formType} onValueChange={(value) => setFormType(value as QuestionType)}>
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
                    <Select value={formDifficulty} onValueChange={(value) => setFormDifficulty(value as DifficultyLevel)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">সহজ</SelectItem>
                        <SelectItem value="medium">মাঝারি</SelectItem>
                        <SelectItem value="hard">কঠিন</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>ক্যাটাগরি</Label>
                    <Select value={formCategoryId} onValueChange={(value) => { setFormCategoryId(value); setFormSubcategoryId("none"); }}>
                      <SelectTrigger><SelectValue placeholder="ক্যাটাগরি নির্বাচন করুন" /></SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>সাব ক্যাটাগরি</Label>
                    <Select value={formSubcategoryId} onValueChange={setFormSubcategoryId} disabled={!formCategoryId}>
                      <SelectTrigger><SelectValue placeholder={formCategoryId ? "সাব ক্যাটাগরি নির্বাচন করুন" : "আগে ক্যাটাগরি নির্বাচন করুন"} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">কোনো সাব ক্যাটাগরি নয়</SelectItem>
                        {availableSubcategories.map((subcategory) => <SelectItem key={subcategory.id} value={subcategory.id}>{subcategory.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>ব্যাখ্যা</Label>
                  <Textarea value={formExplanation} onChange={(event) => setFormExplanation(event.target.value)} placeholder="সঠিক উত্তরের ব্যাখ্যা..." rows={2} />
                </div>
                {formType !== "fill_blank" ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>অপশনসমূহ</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addOption}>
                        <Plus className="mr-1 h-3 w-3" /> অপশন যোগ
                      </Button>
                    </div>
                    {formOptions.map((option, index) => (
                      <div key={index} className="space-y-2 rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 text-sm font-medium text-muted-foreground">{index + 1}.</span>
                          <Input className="flex-1" value={option.option_text} onChange={(event) => updateOption(index, "option_text", event.target.value)} placeholder={`অপশন ${index + 1}`} />
                          <label className="flex items-center gap-1 whitespace-nowrap text-sm">
                            <input type={formType === "mcq" ? "radio" : "checkbox"} name="correct_option" checked={option.is_correct} onChange={(event) => updateOption(index, "is_correct", event.target.checked)} />
                            সঠিক
                          </label>
                          {formOptions.length > 2 ? <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(index)}><X className="h-4 w-4" /></Button> : null}
                        </div>
                        <Input value={option.explanation} onChange={(event) => updateOption(index, "explanation", event.target.value)} placeholder="এই অপশনের ব্যাখ্যা (ঐচ্ছিক)" />
                      </div>
                    ))}
                  </div>
                ) : null}
                <Button className="w-full" onClick={handleSave}>{editingQuestion ? "আপডেট করুন" : "সংরক্ষণ করুন"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-dashed">
        <CardContent className="p-4 text-xs text-muted-foreground">
          CSV/Excel টেমপ্লেট হেডার:
          <code className="ml-1 font-mono">
            question_text, question_type, difficulty, category, subcategory, question_explanation, option_1_text, option_1_correct, option_1_explanation ... option_4_explanation
          </code>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { key: "total", title: "Total Questions", value: stats.total },
          { key: "easy", title: "Easy", value: stats.easy },
          { key: "medium", title: "Medium", value: stats.medium },
          { key: "hard", title: "Hard", value: stats.hard },
        ].map((card) => (
          <Card key={card.key}>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{card.title}</p>
              <p className="mt-2 text-3xl font-bold leading-none">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="প্রশ্ন, ক্যাটাগরি বা সাব ক্যাটাগরি খুঁজুন..." value={search} onChange={(event) => setSearch(event.target.value)} />
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

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">কোনো প্রশ্ন পাওয়া যায়নি</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>প্রশ্ন</TableHead>
                  <TableHead className="w-28">ধরন</TableHead>
                  <TableHead className="w-24">কঠিনতা</TableHead>
                  <TableHead className="w-44">ক্যাটাগরি</TableHead>
                  <TableHead className="w-24">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuestions.map((question) => (
                  <TableRow key={question.id}>
                    <TableCell className="max-w-md truncate">{question.question_text}</TableCell>
                    <TableCell><Badge variant="secondary">{typeLabel[question.question_type]}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{difficultyLabel[question.difficulty]}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{question.category || "—"}{question.topic ? ` / ${question.topic}` : ""}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => void openEdit(question)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => void handleDelete(question.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
