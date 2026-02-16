import { useState, useEffect } from "react";
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
import { Plus, Edit, Trash2, Eye } from "lucide-react";

interface Exam {
  id: string;
  title: string;
  description: string | null;
  status: string;
  total_questions: number;
  duration_minutes: number;
  pass_mark: number;
  max_attempts: number;
  reward_coins: number;
  shuffle_options: boolean;
  negative_marking: boolean;
  negative_mark_value: number;
  scheduled_at: string | null;
  ends_at: string | null;
  created_at: string;
}

export default function AdminExams() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Exam | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignExamId, setAssignExamId] = useState<string | null>(null);
  const [allQuestions, setAllQuestions] = useState<any[]>([]);
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("draft");
  const [totalQuestions, setTotalQuestions] = useState(25);
  const [duration, setDuration] = useState(30);
  const [passMark, setPassMark] = useState(40);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [rewardCoins, setRewardCoins] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [negativeValue, setNegativeValue] = useState(0.25);

  const fetchExams = async () => {
    const { data } = await supabase.from("exams").select("*").order("created_at", { ascending: false });
    if (data) setExams(data as any);
    setLoading(false);
  };

  useEffect(() => { fetchExams(); }, []);

  const resetForm = () => {
    setTitle(""); setDescription(""); setStatus("draft"); setTotalQuestions(25);
    setDuration(30); setPassMark(40); setMaxAttempts(1); setRewardCoins(0);
    setShuffle(false); setNegativeMarking(false); setNegativeValue(0.25); setEditing(null);
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
    const payload = {
      title, description: description || null, status: status as any,
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
    setDialogOpen(false); resetForm(); fetchExams();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("exams").delete().eq("id", id);
    toast({ title: "এক্সাম ডিলিট হয়েছে" }); fetchExams();
  };

  const openAssign = async (examId: string) => {
    setAssignExamId(examId);
    const [{ data: qs }, { data: assigned }] = await Promise.all([
      supabase.from("questions").select("id, question_text, category, difficulty"),
      supabase.from("exam_questions").select("question_id").eq("exam_id", examId),
    ]);
    setAllQuestions(qs || []);
    setAssignedIds(new Set((assigned || []).map((a: any) => a.question_id)));
    setAssignDialogOpen(true);
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

  const statusLabel: Record<string, string> = { draft: "ড্রাফট", scheduled: "নির্ধারিত", live: "লাইভ", ended: "শেষ" };
  const statusColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
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
                  <Select value={status} onValueChange={setStatus}>
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
            {allQuestions.length === 0 && <p className="py-4 text-center text-muted-foreground">প্রশ্ন ব্যাংকে কোনো প্রশ্ন নেই</p>}
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
