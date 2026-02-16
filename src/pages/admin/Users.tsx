import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type ProfileRow = Tables<"profiles">;
type UserRoleRow = Tables<"user_roles">;

interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string;
  coin_balance: number;
  created_at: string;
  roles: string[];
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      const { data: roles } = await supabase.from("user_roles").select("*");

      const roleMap = new Map<string, string[]>();
      (roles || []).forEach((r: UserRoleRow) => {
        const existing = roleMap.get(r.user_id) || [];
        existing.push(r.role);
        roleMap.set(r.user_id, existing);
      });

      const combined = (profiles || []).map((p: ProfileRow) => ({
        ...p,
        roles: roleMap.get(p.user_id) || ["student"],
      }));
      setUsers(combined);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">পরিক্ষার্থী ম্যানেজমেন্ট</h1>
      <div className="mb-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="নাম দিয়ে খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>নাম</TableHead>
                  <TableHead className="w-28">রোল</TableHead>
                  <TableHead className="w-24">কয়েন</TableHead>
                  <TableHead className="w-36">যোগদান</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {u.roles.map(r => (
                          <Badge key={r} variant={r === "admin" ? "default" : "secondary"}>
                            {r === "admin" ? "অ্যাডমিন" : "শিক্ষার্থী"}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{u.coin_balance}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("bn-BD")}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                      কোনো ইউজার পাওয়া যায়নি
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
