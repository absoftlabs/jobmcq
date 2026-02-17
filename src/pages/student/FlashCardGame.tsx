import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Coins, RotateCcw, ArrowRight, Trophy, Sparkles } from "lucide-react";

interface FlashCardOption {
  text: string;
  is_correct: boolean;
}

interface FlashCard {
  id: string;
  card_type: string;
  question: string;
  answer: string | null;
  options: FlashCardOption[];
  image_url: string | null;
  explanation: string | null;
  difficulty: string;
  coin_points: number;
  topic: string | null;
}

interface FlashCardCategory {
  id: string;
  name: string;
  description: string | null;
}

type GameState = "lobby" | "playing" | "result";

export default function FlashCardGame() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryFilter = searchParams.get("category");

  const [gameState, setGameState] = useState<GameState>("lobby");
  const [categories, setCategories] = useState<FlashCardCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categoryFilter);
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerResult, setAnswerResult] = useState<"correct" | "wrong" | null>(null);
  const [score, setScore] = useState({ correct: 0, wrong: 0, coins: 0 });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from("flash_card_categories")
        .select("id, name, description")
        .eq("is_active", true)
        .order("sort_order");
      setCategories((data || []) as FlashCardCategory[]);
      setLoading(false);
    };
    void fetchCategories();
  }, []);

  const startGame = useCallback(async (catId: string | null) => {
    let query = supabase
      .from("flash_cards")
      .select("id, card_type, question, answer, options, image_url, explanation, difficulty, coin_points, topic")
      .eq("is_enabled", true);

    if (catId) query = query.eq("category_id", catId);
    const { data } = await query.order("created_at", { ascending: false }).limit(20);
    const fetched = ((data || []) as any[]).map((c) => ({
      ...c,
      options: Array.isArray(c.options) ? c.options : [],
    })) as FlashCard[];

    if (fetched.length === 0) {
      toast({ title: "কোনো কার্ড পাওয়া যায়নি", variant: "destructive" });
      return;
    }

    // Shuffle
    const shuffled = [...fetched].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setScore({ correct: 0, wrong: 0, coins: 0 });
    setFlipped(false);
    setSelectedAnswer(null);
    setAnswerResult(null);

    // Create session for logged-in users
    if (user) {
      const { data: session } = await supabase
        .from("flash_card_sessions")
        .insert({
          user_id: user.id,
          category_id: catId,
          total_cards: shuffled.length,
        })
        .select("id")
        .single();
      setSessionId(session?.id || null);
    }

    setGameState("playing");
  }, [user, toast]);

  const currentCard = cards[currentIndex];
  const progressPercent = cards.length > 0 ? ((currentIndex + 1) / cards.length) * 100 : 0;

  const checkAnswer = async (answer: string) => {
    if (answerResult) return;
    setSelectedAnswer(answer);

    let isCorrect = false;
    const card = currentCard;

    if (card.card_type === "flip") {
      setFlipped(true);
      return;
    }

    if (card.card_type === "true_false" || card.card_type === "mcq") {
      const correctOpt = card.options.find((o) => o.is_correct);
      isCorrect = correctOpt?.text === answer;
    }

    setAnswerResult(isCorrect ? "correct" : "wrong");
    const newScore = { ...score };
    if (isCorrect) {
      newScore.correct += 1;
      newScore.coins += card.coin_points;
    } else {
      newScore.wrong += 1;
    }
    setScore(newScore);

    // Save answer for logged-in users
    if (user && sessionId) {
      await supabase.from("flash_card_answers").insert({
        session_id: sessionId,
        card_id: card.id,
        user_answer: answer,
        is_correct: isCorrect,
        coins_awarded: isCorrect ? card.coin_points : 0,
      });
    }
  };

  const markFlipAnswer = async (selfMarkedCorrect: boolean) => {
    const card = currentCard;
    setAnswerResult(selfMarkedCorrect ? "correct" : "wrong");
    const newScore = { ...score };
    if (selfMarkedCorrect) {
      newScore.correct += 1;
      newScore.coins += card.coin_points;
    } else {
      newScore.wrong += 1;
    }
    setScore(newScore);

    if (user && sessionId) {
      await supabase.from("flash_card_answers").insert({
        session_id: sessionId,
        card_id: card.id,
        user_answer: "self_marked",
        is_correct: selfMarkedCorrect,
        coins_awarded: selfMarkedCorrect ? card.coin_points : 0,
      });
    }
  };

  const nextCard = async () => {
    if (currentIndex + 1 >= cards.length) {
      // Game over
      if (user && sessionId) {
        await supabase.from("flash_card_sessions").update({
          correct_answers: score.correct,
          wrong_answers: score.wrong,
          coins_earned: score.coins,
          completed_at: new Date().toISOString(),
        }).eq("id", sessionId);

        // Award coins to wallet
        if (score.coins > 0) {
          await supabase.from("profiles").update({
            coin_balance: (await supabase.from("profiles").select("coin_balance").eq("user_id", user.id).single()).data?.coin_balance! + score.coins,
          }).eq("user_id", user.id);

          await supabase.from("coin_transactions").insert({
            user_id: user.id,
            amount: score.coins,
            transaction_type: "reward",
            reference_id: sessionId,
            description: "ফ্ল্যাশ কার্ড গেম রিওয়ার্ড",
          });
        }
      }

      setGameState("result");

      if (!user) {
        setShowGuestModal(true);
      }
      return;
    }

    setCurrentIndex((prev) => prev + 1);
    setFlipped(false);
    setSelectedAnswer(null);
    setAnswerResult(null);
  };

  const diffLabels: Record<string, string> = { easy: "সহজ", medium: "মাঝারি", hard: "কঠিন" };

  // --- LOBBY ---
  if (gameState === "lobby") {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-6 w-6 text-primary" /> ফ্ল্যাশ কার্ড গেম</h1>
          <p className="text-muted-foreground">একটি ক্যাটাগরি বেছে নিন এবং গেম শুরু করুন</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Card
                className="cursor-pointer border-2 border-dashed border-primary/30 hover:border-primary transition-colors"
                onClick={() => void startGame(null)}
              >
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><RotateCcw className="h-5 w-5 text-primary" /> র‍্যান্ডম মোড</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">সব ক্যাটাগরি থেকে র‍্যান্ডম কার্ড নিয়ে খেলুন</p>
                </CardContent>
              </Card>
            </motion.div>

            {categories.map((cat) => (
              <motion.div key={cat.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Card
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => void startGame(cat.id)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{cat.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{cat.description || "এই ক্যাটাগরি থেকে কার্ড নিয়ে খেলুন"}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- RESULT ---
  if (gameState === "result") {
    const total = score.correct + score.wrong;
    const pct = total > 0 ? Math.round((score.correct / total) * 100) : 0;

    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", duration: 0.5 }}>
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <Trophy className="h-12 w-12 mx-auto text-primary mb-2" />
              <CardTitle className="text-2xl">গেম সমাপ্ত!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="rounded-lg border p-3">
                  <p className="text-2xl font-bold text-accent">{score.correct}</p>
                  <p className="text-xs text-muted-foreground">সঠিক</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-2xl font-bold text-destructive">{score.wrong}</p>
                  <p className="text-xs text-muted-foreground">ভুল</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-2xl font-bold text-primary">{score.coins}</p>
                  <p className="text-xs text-muted-foreground">কয়েন</p>
                </div>
              </div>

              <Progress value={pct} className="h-3" />
              <p className="text-sm text-muted-foreground">{pct}% সঠিক উত্তর</p>

              <div className="flex gap-2">
                <Button onClick={() => setGameState("lobby")} variant="outline" className="flex-1 gap-1"><RotateCcw className="h-4 w-4" /> আবার খেলুন</Button>
                {user && (
                  <Button onClick={() => navigate("/student/wallet")} className="flex-1 gap-1"><Coins className="h-4 w-4" /> ওয়ালেট</Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Guest Modal */}
        <Dialog open={showGuestModal} onOpenChange={setShowGuestModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>আপনার প্রগ্রেস সংরক্ষণ করুন!</DialogTitle>
              <DialogDescription>
                আপনার প্রগ্রেস ও অর্জিত পয়েন্ট সংরক্ষণ করতে অনুগ্রহ করে একটি একাউন্ট তৈরি করুন।
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2">
              <Button onClick={() => navigate("/auth")} className="flex-1">একাউন্ট তৈরি করুন</Button>
              <Button variant="outline" onClick={() => setShowGuestModal(false)} className="flex-1">পরে করব</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // --- PLAYING ---
  if (!currentCard) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">কার্ড {currentIndex + 1} / {cards.length}</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-accent"><CheckCircle2 className="h-4 w-4" /> {score.correct}</span>
            <span className="flex items-center gap-1 text-destructive"><XCircle className="h-4 w-4" /> {score.wrong}</span>
            <span className="flex items-center gap-1 text-primary"><Coins className="h-4 w-4" /> {score.coins}</span>
          </div>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -50, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Flip Card */}
          {currentCard.card_type === "flip" && (
            <div
              className="perspective-1000 cursor-pointer"
              onClick={() => !answerResult && setFlipped(!flipped)}
            >
              <motion.div
                className="relative w-full min-h-[280px]"
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring" }}
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Front */}
                <Card className="absolute inset-0 backface-hidden p-8 flex flex-col items-center justify-center text-center">
                  <Badge variant="outline" className="mb-4">{diffLabels[currentCard.difficulty]} • {currentCard.coin_points} কয়েন</Badge>
                  <p className="text-xl font-semibold">{currentCard.question}</p>
                  {currentCard.image_url && <img src={currentCard.image_url} alt="" className="mt-4 max-h-40 rounded-lg object-contain" />}
                  <p className="mt-4 text-xs text-muted-foreground">ক্লিক করে উত্তর দেখুন</p>
                </Card>

                {/* Back */}
                <Card className="absolute inset-0 backface-hidden p-8 flex flex-col items-center justify-center text-center" style={{ transform: "rotateY(180deg)" }}>
                  <p className="text-lg font-semibold text-primary">{currentCard.answer}</p>
                  {currentCard.explanation && <p className="mt-3 text-sm text-muted-foreground">{currentCard.explanation}</p>}

                  {!answerResult && (
                    <div className="flex gap-3 mt-6">
                      <Button variant="outline" className="gap-1 border-accent text-accent" onClick={(e) => { e.stopPropagation(); void markFlipAnswer(true); }}>
                        <CheckCircle2 className="h-4 w-4" /> জানতাম
                      </Button>
                      <Button variant="outline" className="gap-1 border-destructive text-destructive" onClick={(e) => { e.stopPropagation(); void markFlipAnswer(false); }}>
                        <XCircle className="h-4 w-4" /> জানতাম না
                      </Button>
                    </div>
                  )}
                </Card>
              </motion.div>
            </div>
          )}

          {/* MCQ / True-False / Image Card */}
          {(currentCard.card_type === "mcq" || currentCard.card_type === "true_false" || currentCard.card_type === "image") && (
            <Card className="p-6 space-y-5">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{diffLabels[currentCard.difficulty]}</Badge>
                  <Badge variant="secondary" className="gap-1"><Coins className="h-3 w-3" /> {currentCard.coin_points}</Badge>
                  {currentCard.topic && <Badge variant="outline">{currentCard.topic}</Badge>}
                </div>
                {currentCard.image_url && <img src={currentCard.image_url} alt="" className="max-h-48 rounded-lg object-contain mx-auto" />}
                <p className="text-lg font-semibold">{currentCard.question}</p>
              </div>

              <div className="grid gap-2">
                {currentCard.options.map((opt, i) => {
                  let btnClass = "w-full justify-start text-left h-auto py-3 px-4";
                  if (answerResult) {
                    if (opt.is_correct) btnClass += " border-accent bg-accent/10 text-accent";
                    else if (selectedAnswer === opt.text && !opt.is_correct) btnClass += " border-destructive bg-destructive/10 text-destructive";
                  }

                  return (
                    <motion.div key={i} whileTap={!answerResult ? { scale: 0.98 } : undefined}>
                      <Button
                        variant="outline"
                        className={btnClass}
                        disabled={!!answerResult}
                        onClick={() => void checkAnswer(opt.text)}
                      >
                        <span className="mr-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium">
                          {String.fromCharCode(65 + i)}
                        </span>
                        {opt.text}
                      </Button>
                    </motion.div>
                  );
                })}
              </div>

              {answerResult && currentCard.explanation && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="rounded-lg border bg-muted/50 p-3">
                  <p className="text-sm"><span className="font-semibold">ব্যাখ্যা:</span> {currentCard.explanation}</p>
                </motion.div>
              )}
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Feedback + Next */}
      {answerResult && (
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {answerResult === "correct" ? (
              <Badge className="gap-1 bg-accent text-accent-foreground"><CheckCircle2 className="h-4 w-4" /> সঠিক! +{currentCard.coin_points} কয়েন</Badge>
            ) : (
              <Badge variant="destructive" className="gap-1"><XCircle className="h-4 w-4" /> ভুল উত্তর</Badge>
            )}
          </div>
          <Button onClick={() => void nextCard()} className="gap-1">
            {currentIndex + 1 >= cards.length ? "ফলাফল দেখুন" : "পরবর্তী"} <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </div>
  );
}
