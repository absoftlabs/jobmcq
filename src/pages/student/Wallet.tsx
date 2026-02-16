import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Coins } from "lucide-react";

export default function Wallet() {
  const { user, profile } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("coin_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setTransactions(data || []);
        setLoading(false);
      });
  }, [user]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold flex items-center gap-2">
        <Coins className="h-6 w-6 text-accent" /> কয়েন ওয়ালেট
      </h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">মোট ব্যালেন্স</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{profile?.coin_balance ?? 0} <span className="text-lg text-muted-foreground">কয়েন</span></p>
        </CardContent>
      </Card>

      <h2 className="mb-4 text-lg font-semibold">লেনদেন ইতিহাস</h2>
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">কোনো লেনদেন নেই</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>বিবরণ</TableHead>
                  <TableHead className="w-24">পরিমাণ</TableHead>
                  <TableHead className="w-32">তারিখ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map(t => (
                  <TableRow key={t.id}>
                    <TableCell>{t.description || t.transaction_type}</TableCell>
                    <TableCell className={`font-medium ${t.amount > 0 ? "text-green-600" : "text-destructive"}`}>
                      {t.amount > 0 ? `+${t.amount}` : t.amount}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(t.created_at).toLocaleDateString("bn-BD")}
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
