import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight, Layers, Trophy } from "lucide-react";
import { motion } from "framer-motion";

interface FlashCardCategory {
  id: string;
  name: string;
  description: string | null;
}

export default function FlashCardsPublic() {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<FlashCardCategory[]>([]);
  const [totalCards, setTotalCards] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [catRes, countRes] = await Promise.all([
        supabase.from("flash_card_categories").select("id, name, description").eq("is_active", true).order("sort_order"),
        supabase.from("flash_cards").select("id", { count: "exact", head: true }).eq("is_enabled", true),
      ]);
      setCategories((catRes.data || []) as FlashCardCategory[]);
      setTotalCards(countRes.count || 0);
      setLoading(false);
    };
    void fetchData();
  }, []);

  const dashboardPath = user ? (hasRole("admin") ? "/admin" : "/student") : "/auth";
  const playPath = user ? "/student/flash-cards" : "/play/flash-cards";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-bold">চাকরির প্রস্তুতি</span>
          </Link>
          <Link to={dashboardPath}>
            <Button>{user ? "ড্যাশবোর্ড" : "লগইন"}</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-14 text-center space-y-5">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary mb-3">
            <Layers className="mr-1 h-3 w-3" /> ফ্ল্যাশ কার্ড গেম
          </Badge>
          <h1 className="text-4xl font-black md:text-5xl">
            খেলতে খেলতে <span className="text-primary">শিখুন</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            ফ্ল্যাশ কার্ড গেমের মাধ্যমে প্রশ্নের উত্তর দিন, পয়েন্ট অর্জন করুন এবং আপনার জ্ঞান যাচাই করুন। গেস্ট ও লগইন ইউজার উভয়েই খেলতে পারবেন!
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link to={playPath}>
              <Button size="lg" className="gap-2">গেম শুরু করুন <ArrowRight className="h-4 w-4" /></Button>
            </Link>
          </div>
          <div className="mt-4 flex justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Layers className="h-4 w-4" /> {totalCards} কার্ড</span>
            <span className="flex items-center gap-1"><Trophy className="h-4 w-4" /> কয়েন রিওয়ার্ড</span>
          </div>
        </motion.div>
      </section>

      {/* Categories */}
      <section className="container pb-16 space-y-6">
        <h2 className="text-2xl font-bold">ক্যাটাগরি সমূহ</h2>
        {loading ? (
          <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        ) : categories.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">কোনো ক্যাটাগরি নেই</CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat, i) => (
              <motion.div key={cat.id} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}>
                <Card className="group cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg" onClick={() => navigate(`${playPath}?category=${cat.id}`)}>
                  <CardHeader>
                    <CardTitle className="text-lg">{cat.name}</CardTitle>
                    <CardDescription>{cat.description || "এই ক্যাটাগরি থেকে কার্ড নিয়ে খেলুন"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" size="sm" className="gap-1">
                      খেলুন <ArrowRight className="h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container flex flex-col items-start justify-between gap-2 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Job MCQ Arena. সর্বস্বত্ব সংরক্ষিত।</p>
          <div className="flex gap-4">
            <Link to="/" className="hover:text-foreground">হোম</Link>
            <Link to={dashboardPath} className="hover:text-foreground">{user ? "ড্যাশবোর্ড" : "লগইন"}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
