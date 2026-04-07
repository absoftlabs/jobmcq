import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { type Session, type User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from "@/lib/withTimeout";
import { resolveAccountStatus } from "@/lib/account-status";

type AppRole = "admin" | "student";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  profile: { full_name: string; coin_balance: number; account_status: string } | null;
  hasRole: (role: AppRole) => boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profile, setProfile] = useState<{ full_name: string; coin_balance: number; account_status: string } | null>(null);
  const forceSigningOutRef = useRef(false);

  const getUserRoles = async (userId: string) => {
    const { data } = await withTimeout(
      supabase.from("user_roles").select("role").eq("user_id", userId),
      8000,
      "ইউজার role ডাটা লোড হতে টাইমআউট হয়েছে।",
    );

    return (data || []).map((row: { role: string }) => row.role as AppRole);
  };

  const updateLastLogin = async (userId: string) => {
    await supabase
      .from("profiles")
      .update({ last_login_at: new Date().toISOString() })
      .eq("user_id", userId);
  };

  const getProfileAccess = async (userId: string) => {
    const { data, error } = await withTimeout(
      supabase
        .from("profiles")
        .select("full_name, coin_balance, account_status, suspended_at, last_login_at")
        .eq("user_id", userId)
        .maybeSingle(),
      8000,
      "প্রোফাইল ডাটা লোড হতে টাইমআউট হয়েছে।",
    );

    if (!error && data) {
      return {
        full_name: data.full_name ?? "",
        coin_balance: Number(data.coin_balance ?? 0),
        account_status: resolveAccountStatus(data.account_status, data.suspended_at, data.last_login_at),
      };
    }

    const fallback = await withTimeout(
      supabase
        .from("profiles")
        .select("full_name, coin_balance, last_login_at")
        .eq("user_id", userId)
        .maybeSingle(),
      8000,
      "প্রোফাইল fallback ডাটা লোড হতে টাইমআউট হয়েছে।",
    );

    if (fallback.error) {
      throw fallback.error;
    }

    return {
      full_name: fallback.data?.full_name ?? "",
      coin_balance: Number(fallback.data?.coin_balance ?? 0),
      account_status: resolveAccountStatus("active", null, fallback.data?.last_login_at ?? null),
    };
  };

  const enforceAccountAccess = async (userId: string) => {
    let status = "pending";

    try {
      const currentRoles = await getUserRoles(userId);
      if (currentRoles.includes("admin")) {
        return true;
      }

      const currentProfile = await getProfileAccess(userId);
      status = currentProfile.account_status;
    } catch {
      status = "pending";
    }

    if (status !== "active") {
      setSession(null);
      setUser(null);
      setRoles([]);
      setProfile(null);
      if (!forceSigningOutRef.current) {
        forceSigningOutRef.current = true;
        await supabase.auth.signOut();
      }
      return false;
    }

    return true;
  };

  const fetchUserData = async (userId: string) => {
    try {
      const [rolesRes, profileRes] = await Promise.all([
        getUserRoles(userId),
        getProfileAccess(userId),
      ]);

      setRoles(rolesRes || []);

      if (profileRes) {
        setProfile({
          full_name: profileRes.full_name,
          coin_balance: profileRes.coin_balance,
          account_status: profileRes.account_status,
        });
      } else {
        setProfile(null);
      }
    } catch {
      setRoles([]);
      setProfile(null);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await withTimeout(
          supabase.auth.getSession(),
          8000,
          "সেশন ডাটা লোড হতে টাইমআউট হয়েছে।",
        );
        if (!isMounted) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);

        if (currentSession?.user) {
          const allowed = await enforceAccountAccess(currentSession.user.id);
          if (allowed) {
            void fetchUserData(currentSession.user.id);
          }
        } else {
          setRoles([]);
          setProfile(null);
        }
      } catch {
        if (!isMounted) return;
        setSession(null);
        setUser(null);
        setRoles([]);
        setProfile(null);
        setLoading(false);
      }
    };

    void initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      void (async () => {
        try {
          if (event === "SIGNED_OUT") {
            forceSigningOutRef.current = false;
          }

          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          setLoading(false);

          if (currentSession?.user) {
            const allowed = await enforceAccountAccess(currentSession.user.id);
            if (!allowed) return;
            if (event === "SIGNED_IN") {
              void updateLastLogin(currentSession.user.id);
            }
            void fetchUserData(currentSession.user.id);
          } else {
            setRoles([]);
            setProfile(null);
          }
        } catch {
          setRoles([]);
          setProfile(null);
          setLoading(false);
        }
      })();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const hasRole = (role: AppRole) => {
    if (role === "student") {
      return roles.length === 0 || roles.includes("student");
    }
    return roles.includes(role);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, roles, profile, hasRole, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
