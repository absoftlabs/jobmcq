import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  full_name: string;
  user_id: string;
  score: number;
  time_taken_seconds: number;
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("exams").select("id, title").in("status", ["live", "ended"]).then(({ data }) => {
      setExams(data || []);
      if (data && data.length > 0) setSelectedExam((data[0] as any).id);
    });
  }, []);

  useEffect(() => {
    if (!selectedExam) return;
    setLoading(true);
    const fetch = async () => {
      const { data: attempts } = await supabase
        .from("attempts")
        .select("user_id, score, time_taken_seconds, submitted_at")
        .eq("exam_id", selectedExam)
        .not("submitted_at", "is", null)
        .order("score", { ascending: false })
        .order("time_taken_seconds", { ascending: true })
        .order("submitted_at", { ascending: true })
        .limit(50);

      if (!attempts || attempts.length === 0) { setEntries([]); setLoading(false); return; }

      // Best attempt per user
      const bestMap = new Map<string, any>();
      (attempts as any[]).forEach(a => {
        const existing = bestMap.get(a.user_id);
        if (!existing || a.score > existing.score || (a.score === existing.score && a.time_taken_seconds < existing.time_taken_seconds)) {
          bestMap.set(a.user_id, a);
        }
      });

      const userIds = [...bestMap.keys()];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const nameMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name]));

      const sorted = [...bestMap.values()]
        .sort((a, b) => b.score - a.score || a.time_taken_seconds - b.time_taken_seconds || new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime())
        .map((a, i) => ({
          rank: i + 1,
          full_name: nameMap.get(a.user_id) || "—",
          user_id: a.user_id,
          score: Number(a.score),
          time_taken_seconds: a.time_taken_seconds || 0,
        }));

      setEntries(sorted);
      setLoading(false);
    };
    fetch();
  }, [selectedExam]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m} মিনিট ${sec} সেকেন্ড`;
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold flex items-center gap-2">
        <Trophy className="h-6 w-6 text-accent" /> লিডারবোর্ড
      </h1>

      <div className="mb-4 max-w-xs">
        <Select value={selectedExam} onValueChange={setSelectedExam}>
          <SelectTrigger><SelectValue placeholder="পরিক্ষা নির্বাচন করুন" /></SelectTrigger>
          <SelectContent>
            {exams.map((e: any) => (
              <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : entries.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">এই পরিক্ষায় এখনো কেউ অংশ নেয়নি</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">র‍্যাঙ্ক</TableHead>
                  <TableHead>নাম</TableHead>
                  <TableHead className="w-24">স্কোর</TableHead>
                  <TableHead className="w-40">সময়</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map(e => {
                  const isMe = e.user_id === user?.id;
                  return (
                    <TableRow key={e.user_id} className={isMe ? "bg-primary/5" : ""}>
                      <TableCell>
                        <span className="font-bold">
                          {e.rank <= 3 ? ["🥇", "🥈", "🥉"][e.rank - 1] : `#${e.rank}`}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">
                        {e.full_name}
                        {isMe && <Badge variant="outline" className="ml-2 text-xs">আমি</Badge>}
                      </TableCell>
                      <TableCell>{e.score.toFixed(1)}%</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatTime(e.time_taken_seconds)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
