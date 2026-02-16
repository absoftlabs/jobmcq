import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "student";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  profile: { full_name: string; coin_balance: number } | null;
  hasRole: (role: AppRole) => boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profile, setProfile] = useState<{ full_name: string; coin_balance: number } | null>(null);

  const fetchUserData = async (userId: string) => {
    try {
      const [rolesRes, profileRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("profiles").select("full_name, coin_balance").eq("user_id", userId).single(),
      ]);

      if (rolesRes.data) setRoles(rolesRes.data.map((r: { role: string }) => r.role as AppRole));
      else setRoles([]);

      if (profileRes.data) {
        setProfile({
          full_name: profileRes.data.full_name ?? "",
          coin_balance: Number(profileRes.data.coin_balance ?? 0),
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
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          void fetchUserData(session.user.id);
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
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          void fetchUserData(session.user.id);
        } else {
          setRoles([]);
          setProfile(null);
        }
      } catch {
        setRoles([]);
        setProfile(null);
      } finally {
        setLoading(false);
      }
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
  const signOut = async () => { await supabase.auth.signOut(); };

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
