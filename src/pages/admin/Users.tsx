import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import { withTimeout } from "@/lib/withTimeout";
import { resolveAccountStatus, type AccountStatus } from "@/lib/account-status";

type ProfileRow = Tables<"profiles">;
type UserRoleRow = Tables<"user_roles">;

interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string;
  coin_balance: number;
  created_at: string;
  last_login_at: string | null;
  suspended_at: string | null;
  account_status: AccountStatus;
  roles: string[];
}

const toBnNumber = (value: number): string => value.toLocaleString("bn-BD");

const formatRelativeTimeBn = (value: string | null): string => {
  if (!value) return "অনুমোদন হয়নি";

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

export default function AdminUsers() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let profiles: Array<
        ProfileRow & {
          suspended_at?: string | null;
          last_login_at?: string | null;
        }
      > = [];

      const primaryProfiles = await withTimeout(
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        12000,
        "ইউজার লিস্ট লোড হতে টাইমআউট হয়েছে।",
      );

      if (!primaryProfiles.error) {
        profiles = (primaryProfiles.data || []) as Array<ProfileRow & { suspended_at?: string | null; last_login_at?: string | null }>;
      } else {
        const fallbackProfiles = await withTimeout(
          supabase
            .from("profiles")
            .select("id, user_id, full_name, coin_balance, created_at, updated_at, avatar_url, last_login_at, suspended_at")
            .order("created_at", { ascending: false }),
          12000,
          "ইউজার fallback ডাটা লোড হতে টাইমআউট হয়েছে।",
        );

        profiles = ((fallbackProfiles.data || []) as Array<Omit<ProfileRow, "account_status"> & { suspended_at?: string | null; last_login_at?: string | null }>).map(
          (row) => ({
            ...row,
            account_status: "active",
          }),
        ) as Array<ProfileRow & { suspended_at?: string | null; last_login_at?: string | null }>;
      }

      const { data: roles, error: rolesError } = await withTimeout(
        supabase.from("user_roles").select("*"),
        12000,
        "ইউজার role লোড হতে টাইমআউট হয়েছে।",
      );

      if (rolesError) throw rolesError;

      const roleMap = new Map<string, string[]>();
      (roles || []).forEach((row: UserRoleRow) => {
        const current = roleMap.get(row.user_id) || [];
        current.push(row.role);
        roleMap.set(row.user_id, current);
      });

      const combined = profiles.map((profileRow) => ({
        ...profileRow,
        suspended_at: profileRow.suspended_at ?? null,
        last_login_at: profileRow.last_login_at ?? null,
        account_status: resolveAccountStatus(
          profileRow.account_status,
          profileRow.suspended_at ?? null,
          profileRow.last_login_at ?? null,
        ),
        roles: roleMap.get(profileRow.user_id) || ["student"],
      }));

      setUsers(combined);
    } catch (error) {
      setUsers([]);
      toast({
        title: "ইউজার ডাটা লোড হয়নি",
        description: error instanceof Error ? error.message : "ডাটাবেস কানেকশন বা query সমস্যা হয়েছে।",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  const filtered = users.filter((user) => {
    if (user.account_status === "deleted") return false;
    return user.full_name.toLowerCase().includes(search.toLowerCase());
  });

  const updateStatus = async (user: UserWithRole, status: AccountStatus) => {
    setUpdatingUserId(user.user_id);

    const primaryPayload =
      status === "pending"
        ? { account_status: "pending", suspended_at: null, last_login_at: null }
        : status === "suspended"
          ? { account_status: "suspended", suspended_at: new Date().toISOString() }
          : status === "active"
            ? {
                account_status: "active",
                suspended_at: null,
                last_login_at: user.last_login_at ?? new Date().toISOString(),
              }
            : { account_status: "deleted", suspended_at: new Date().toISOString() };

    let { error } = await supabase.from("profiles").update(primaryPayload).eq("user_id", user.user_id);

    if (error && status === "pending") {
      const fallbackResult = await supabase
        .from("profiles")
        .update({ account_status: "active", suspended_at: null, last_login_at: null })
        .eq("user_id", user.user_id);

      error = fallbackResult.error;
    }

    if (error) {
      toast({ title: "আপডেট ব্যর্থ", description: error.message, variant: "destructive" });
      setUpdatingUserId(null);
      return;
    }

    setUsers((prev) =>
      prev.map((row) =>
        row.user_id === user.user_id
          ? {
              ...row,
              account_status: status,
              suspended_at: status === "suspended" ? new Date().toISOString() : null,
              last_login_at: status === "pending" ? null : status === "active" ? row.last_login_at ?? new Date().toISOString() : row.last_login_at,
            }
          : row,
      ),
    );

    if (status === "pending") {
      toast({ title: "শিক্ষার্থী অনুমোদনের অপেক্ষায় রাখা হয়েছে" });
    } else if (status === "suspended") {
      toast({ title: "শিক্ষার্থী সাসপেন্ড করা হয়েছে" });
    } else if (status === "active") {
      toast({ title: "শিক্ষার্থী অনুমোদিত হয়েছে" });
    } else {
      toast({ title: "শিক্ষার্থী ডিলেট করা হয়েছে" });
    }

    setUpdatingUserId(null);
  };

  const statusBadge = (status: AccountStatus) => {
    if (status === "pending") return <Badge variant="outline">Pending</Badge>;
    if (status === "suspended") return <Badge variant="destructive">Suspended</Badge>;
    if (status === "deleted") return <Badge variant="outline">Deleted</Badge>;
    return <Badge variant="secondary">Approved</Badge>;
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
                {filtered.map((user) => {
                  const isAdmin = user.roles.includes("admin");
                  const busy = updatingUserId === user.user_id;

                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {user.roles.map((role) => (
                            <Badge key={role} variant={role === "admin" ? "default" : "secondary"}>
                              {role === "admin" ? "অ্যাডমিন" : "শিক্ষার্থী"}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{user.coin_balance}</TableCell>
                      <TableCell>{statusBadge(user.account_status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatRelativeTimeBn(user.last_login_at)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(user.created_at).toLocaleDateString("bn-BD")}</TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <span className="text-xs text-muted-foreground">অ্যাডমিন ইউজারে অ্যাকশন নেই</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {user.account_status !== "active" ? (
                              <Button size="sm" onClick={() => void updateStatus(user, "active")} disabled={busy}>
                                অনুমোদন দিন
                              </Button>
                            ) : (
                              <Button size="sm" variant="secondary" onClick={() => void updateStatus(user, "pending")} disabled={busy}>
                                পেন্ডিং করুন
                              </Button>
                            )}

                            {user.account_status !== "suspended" && (
                              <Button size="sm" variant="secondary" onClick={() => void updateStatus(user, "suspended")} disabled={busy}>
                                সাসপেন্ড
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                const ok = window.confirm("এই শিক্ষার্থীকে ডিলেট করতে চান?");
                                if (ok) void updateStatus(user, "deleted");
                              }}
                              disabled={busy || user.account_status === "deleted"}
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
                      কোনো পরীক্ষার্থী পাওয়া যায়নি।
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
