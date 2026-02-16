import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type ProfileRow = Tables<"profiles">;
type UserRoleRow = Tables<"user_roles">;
type AccountStatus = "active" | "suspended" | "deleted";

interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string;
  coin_balance: number;
  created_at: string;
  last_login_at: string | null;
  account_status: AccountStatus;
  roles: string[];
}

const toBnNumber = (value: number): string => value.toLocaleString("bn-BD");

const formatRelativeTimeBn = (value: string | null): string => {
  if (!value) return "কখনও লগইন করেনি";

  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "তথ্য নেই";

  const diffMs = Date.now() - then;
  if (diffMs < 60 * 1000) return "এইমাত্র";

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  if (diffMs < hour) return `${toBnNumber(Math.floor(diffMs / minute))} মিনিট আগে`;
  if (diffMs < day) return `${toBnNumber(Math.floor(diffMs / hour))} ঘণ্টা আগে`;
  if (diffMs < week) return `${toBnNumber(Math.floor(diffMs / day))} দিন আগে`;
  if (diffMs < month) return `${toBnNumber(Math.floor(diffMs / week))} সপ্তাহ আগে`;
  if (diffMs < year) return `${toBnNumber(Math.floor(diffMs / month))} মাস আগে`;
  return `${toBnNumber(Math.floor(diffMs / year))} বছর আগে`;
};

const normalizeAccountStatus = (value: string | null | undefined): AccountStatus => {
  if (value === "suspended" || value === "deleted") return value;
  return "active";
};

export default function AdminUsers() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
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
      account_status: normalizeAccountStatus(p.account_status),
      roles: roleMap.get(p.user_id) || ["student"],
    }));

    setUsers(combined);
    setLoading(false);
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  const filtered = users.filter((u) => {
    if (u.account_status === "deleted") return false;
    return u.full_name.toLowerCase().includes(search.toLowerCase());
  });

  const updateStatus = async (user: UserWithRole, status: AccountStatus) => {
    setUpdatingUserId(user.user_id);
    const payload = {
      account_status: status,
      suspended_at: status === "suspended" ? new Date().toISOString() : null,
    };

    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("user_id", user.user_id);

    if (error) {
      toast({ title: "আপডেট ব্যর্থ", description: error.message, variant: "destructive" });
      setUpdatingUserId(null);
      return;
    }

    setUsers((prev) => prev.map((u) => (u.user_id === user.user_id ? { ...u, ...payload, account_status: status } : u)));

    if (status === "suspended") {
      toast({ title: "শিক্ষার্থী সাসপেন্ড করা হয়েছে" });
    } else if (status === "active") {
      toast({ title: "শিক্ষার্থী রি-এ্যাডমিট করা হয়েছে" });
    } else {
      toast({ title: "শিক্ষার্থী ডিলেট করা হয়েছে" });
    }

    setUpdatingUserId(null);
  };

  const statusBadge = (status: AccountStatus) => {
    if (status === "suspended") return <Badge variant="destructive">Suspended</Badge>;
    if (status === "deleted") return <Badge variant="outline">Deleted</Badge>;
    return <Badge variant="secondary">Active</Badge>;
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">পরীক্ষার্থী ম্যানেজমেন্ট</h1>
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="নাম দিয়ে খুঁজুন..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
                  <TableHead className="w-24">কয়েন</TableHead>
                  <TableHead className="w-28">স্ট্যাটাস</TableHead>
                  <TableHead className="w-40">সর্বশেষ লগইন</TableHead>
                  <TableHead className="w-36">যোগদান</TableHead>
                  <TableHead className="w-64">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => {
                  const isAdmin = u.roles.includes("admin");
                  const busy = updatingUserId === u.user_id;
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {u.roles.map((r) => (
                            <Badge key={r} variant={r === "admin" ? "default" : "secondary"}>
                              {r === "admin" ? "অ্যাডমিন" : "শিক্ষার্থী"}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{u.coin_balance}</TableCell>
                      <TableCell>{statusBadge(u.account_status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatRelativeTimeBn(u.last_login_at)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(u.created_at).toLocaleDateString("bn-BD")}</TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <span className="text-xs text-muted-foreground">অ্যাডমিন ইউজারে অ্যাকশন নেই</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {u.account_status === "suspended" ? (
                              <Button size="sm" onClick={() => void updateStatus(u, "active")} disabled={busy}>
                                রি-এ্যাডমিট
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => void updateStatus(u, "suspended")}
                                disabled={busy || u.account_status === "deleted"}
                              >
                                সাসপেন্ড
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                const ok = window.confirm("এই শিক্ষার্থীকে ডিলেট করতে চান?");
                                if (ok) void updateStatus(u, "deleted");
                              }}
                              disabled={busy || u.account_status === "deleted"}
                            >
                              ডিলেট
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      কোনো ইউজার পাওয়া যায়নি
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
