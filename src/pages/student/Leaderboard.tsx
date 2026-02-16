import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

interface LeaderboardEntry {
  rank: number;
  full_name: string;
  user_id: string;
  points: number;
  passed_exams: number;
}

type ProfileLite = Pick<Tables<"profiles">, "user_id" | "full_name" | "coin_balance">;
type PassedAttemptLite = Pick<Tables<"attempts">, "user_id">;

export default function Leaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const [{ data: profiles }, { data: passedAttempts }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, coin_balance"),
        supabase.from("attempts").select("user_id").eq("is_passed", true).not("submitted_at", "is", null),
      ]);

      const typedProfiles = (profiles || []) as ProfileLite[];
      const typedPassed = (passedAttempts || []) as PassedAttemptLite[];

      const passedCountMap = new Map<string, number>();
      typedPassed.forEach((a) => {
        passedCountMap.set(a.user_id, (passedCountMap.get(a.user_id) || 0) + 1);
      });

      const ranked = typedProfiles
        .map((p) => ({
          user_id: p.user_id,
          full_name: p.full_name || "-",
          points: p.coin_balance ?? 0,
          passed_exams: passedCountMap.get(p.user_id) || 0,
        }))
        .sort((a, b) => b.points - a.points || b.passed_exams - a.passed_exams || a.full_name.localeCompare(b.full_name))
        .map((p, i) => ({
          rank: i + 1,
          ...p,
        }));

      setEntries(ranked);
      setLoading(false);
    };

    void fetchLeaderboard();
  }, []);

  return (
    <div>
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold">
        <Trophy className="h-6 w-6 text-accent" /> লিডারবোর্ড
      </h1>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : entries.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">এখনও কোনো ডেটা নেই</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">র‍্যাঙ্ক</TableHead>
                  <TableHead>নাম</TableHead>
                  <TableHead className="w-28">পাস পরীক্ষা</TableHead>
                  <TableHead className="w-24">পয়েন্ট</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => {
                  const isMe = e.user_id === user?.id;
                  return (
                    <TableRow key={e.user_id} className={isMe ? "bg-primary/5" : ""}>
                      <TableCell>
                        <span className="font-bold">{e.rank <= 3 ? ["🥇", "🥈", "🥉"][e.rank - 1] : `#${e.rank}`}</span>
                      </TableCell>
                      <TableCell className="font-medium">
                        {e.full_name}
                        {isMe && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            আমি
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{e.passed_exams}</TableCell>
                      <TableCell>{e.points}</TableCell>
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
