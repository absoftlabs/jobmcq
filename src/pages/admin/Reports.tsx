import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Eye } from "lucide-react";

interface Report {
  id: string;
  question_id: string;
  report_type: string;
  message: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  question_text?: string;
}

export default function AdminReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [newStatus, setNewStatus] = useState("pending");
  const { toast } = useToast();

  const fetchReports = async () => {
    const { data } = await supabase
      .from("question_reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      const qIds = [...new Set(data.map((r: any) => r.question_id))];
      const { data: qs } = await supabase.from("questions").select("id, question_text").in("id", qIds);
      const qMap = new Map((qs || []).map((q: any) => [q.id, q.question_text]));
      setReports(data.map((r: any) => ({ ...r, question_text: qMap.get(r.question_id) || "—" })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchReports(); }, []);

  const handleUpdate = async () => {
    if (!selectedReport) return;
    const { error } = await supabase.from("question_reports").update({
      status: newStatus as any, admin_note: adminNote || null,
    }).eq("id", selectedReport.id);
    if (error) { toast({ title: "আপডেট ব্যর্থ", variant: "destructive" }); return; }
    toast({ title: "রিপোর্ট আপডেট হয়েছে" });
    setSelectedReport(null);
    fetchReports();
  };

  const statusLabel: Record<string, string> = { pending: "পেন্ডিং", reviewed: "পর্যালোচিত", fixed: "সমাধান", rejected: "বাতিল" };
  const statusColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "outline", reviewed: "secondary", fixed: "default", rejected: "destructive",
  };
  const reportTypeLabel: Record<string, string> = {
    wrong_answer: "ভুল উত্তর", spelling: "বানান ভুল", info_error: "তথ্য ভুল",
    missing_option: "অপশন কম", other: "অন্যান্য",
  };

  const filtered = reports.filter(r => filterStatus === "all" || r.status === filterStatus);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">রিপোর্ট ম্যানেজমেন্ট</h1>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="স্ট্যাটাস" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সব</SelectItem>
            <SelectItem value="pending">পেন্ডিং</SelectItem>
            <SelectItem value="reviewed">পর্যালোচিত</SelectItem>
            <SelectItem value="fixed">সমাধান</SelectItem>
            <SelectItem value="rejected">বাতিল</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Dialog open={!!selectedReport} onOpenChange={o => { if (!o) setSelectedReport(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>রিপোর্ট বিস্তারিত</DialogTitle></DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">প্রশ্ন:</p>
                <p className="text-sm">{selectedReport.question_text}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">রিপোর্টের ধরন:</p>
                <p className="text-sm">{reportTypeLabel[selectedReport.report_type] || selectedReport.report_type}</p>
              </div>
              {selectedReport.message && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">বার্তা:</p>
                  <p className="text-sm">{selectedReport.message}</p>
                </div>
              )}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">স্ট্যাটাস আপডেট:</p>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">পেন্ডিং</SelectItem>
                    <SelectItem value="reviewed">পর্যালোচিত</SelectItem>
                    <SelectItem value="fixed">সমাধান</SelectItem>
                    <SelectItem value="rejected">বাতিল</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">অ্যাডমিন নোট:</p>
                <Textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} placeholder="আপনার মন্তব্য..." rows={3} />
              </div>
              <Button className="w-full" onClick={handleUpdate}>আপডেট করুন</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">কোনো রিপোর্ট নেই</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>প্রশ্ন</TableHead>
                  <TableHead className="w-28">ধরন</TableHead>
                  <TableHead className="w-28">স্ট্যাটাস</TableHead>
                  <TableHead className="w-36">তারিখ</TableHead>
                  <TableHead className="w-16">দেখুন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="max-w-xs truncate">{r.question_text}</TableCell>
                    <TableCell className="text-sm">{reportTypeLabel[r.report_type] || r.report_type}</TableCell>
                    <TableCell><Badge variant={statusColor[r.status]}>{statusLabel[r.status]}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString("bn-BD")}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => {
                        setSelectedReport(r); setAdminNote(r.admin_note || ""); setNewStatus(r.status);
                      }}>
                        <Eye className="h-4 w-4" />
                      </Button>
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
