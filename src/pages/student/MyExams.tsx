import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

export default function MyExams() {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("attempts")
        .select("*")
        .eq("user_id", user.id)
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false });

      if (data && data.length > 0) {
        const examIds = [...new Set(data.map((a: any) => a.exam_id))];
        const { data: exams } = await supabase.from("exams").select("id, title").in("id", examIds);
        const examMap = new Map((exams || []).map((e: any) => [e.id, e.title]));
        setAttempts(data.map((a: any) => ({ ...a, exam_title: examMap.get(a.exam_id) || "—" })));
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">আমার পরিক্ষাসমূহ</h1>
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : attempts.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">এখনো কোনো পরিক্ষা দেননি</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>পরিক্ষা</TableHead>
                  <TableHead className="w-20">স্কোর</TableHead>
                  <TableHead className="w-20">ফলাফল</TableHead>
                  <TableHead className="w-32">তারিখ</TableHead>
                  <TableHead className="w-16">দেখুন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.exam_title}</TableCell>
                    <TableCell>{Number(a.score).toFixed(1)}%</TableCell>
                    <TableCell>
                      <Badge variant={a.is_passed ? "default" : "destructive"}>
                        {a.is_passed ? "পাস" : "ফেল"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(a.submitted_at).toLocaleDateString("bn-BD")}
                    </TableCell>
                    <TableCell>
                      <Link to={`/student/result/${a.id}`}>
                        <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                      </Link>
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
