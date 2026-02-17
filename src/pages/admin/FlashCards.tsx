import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Layers, FolderTree } from "lucide-react";

interface FlashCardCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

interface FlashCardOption {
  text: string;
  is_correct: boolean;
}

interface FlashCard {
  id: string;
  category_id: string | null;
  card_type: string;
  question: string;
  answer: string | null;
  options: FlashCardOption[];
  image_url: string | null;
  explanation: string | null;
  difficulty: string;
  coin_points: number;
  is_enabled: boolean;
  topic: string | null;
  created_at: string;
}

export default function AdminFlashCards() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Categories state
  const [categories, setCategories] = useState<FlashCardCategory[]>([]);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<FlashCardCategory | null>(null);
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");

  // Cards state
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<FlashCard | null>(null);
  const [cardType, setCardType] = useState<string>("flip");
  const [cardQuestion, setCardQuestion] = useState("");
  const [cardAnswer, setCardAnswer] = useState("");
  const [cardExplanation, setCardExplanation] = useState("");
  const [cardDifficulty, setCardDifficulty] = useState("easy");
  const [cardCoinPoints, setCardCoinPoints] = useState(1);
  const [cardCategoryId, setCardCategoryId] = useState<string>("");
  const [cardTopic, setCardTopic] = useState("");
  const [cardImageUrl, setCardImageUrl] = useState("");
  const [cardOptions, setCardOptions] = useState<FlashCardOption[]>([
    { text: "", is_correct: false },
    { text: "", is_correct: false },
  ]);
  const [cardEnabled, setCardEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [catRes, cardRes] = await Promise.all([
      supabase.from("flash_card_categories").select("*").order("sort_order"),
      supabase.from("flash_cards").select("*").order("created_at", { ascending: false }),
    ]);
    if (catRes.data) setCategories(catRes.data as FlashCardCategory[]);
    if (cardRes.data) {
      setCards(
        (cardRes.data as any[]).map((c) => ({
          ...c,
          options: Array.isArray(c.options) ? c.options : [],
        }))
      );
    }
    setLoading(false);
  };

  // --- Category CRUD ---
  const openCatDialog = (cat?: FlashCardCategory) => {
    if (cat) {
      setEditingCat(cat);
      setCatName(cat.name);
      setCatDesc(cat.description || "");
    } else {
      setEditingCat(null);
      setCatName("");
      setCatDesc("");
    }
    setCatDialogOpen(true);
  };

  const saveCat = async () => {
    const slug = catName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\u0980-\u09FF-]/g, "");
    if (editingCat) {
      await supabase.from("flash_card_categories").update({ name: catName, slug, description: catDesc || null }).eq("id", editingCat.id);
    } else {
      await supabase.from("flash_card_categories").insert({ name: catName, slug, description: catDesc || null });
    }
    setCatDialogOpen(false);
    toast({ title: "সংরক্ষিত হয়েছে" });
    void fetchAll();
  };

  const deleteCat = async (id: string) => {
    await supabase.from("flash_card_categories").delete().eq("id", id);
    toast({ title: "মুছে ফেলা হয়েছে" });
    void fetchAll();
  };

  const toggleCatActive = async (cat: FlashCardCategory) => {
    await supabase.from("flash_card_categories").update({ is_active: !cat.is_active }).eq("id", cat.id);
    void fetchAll();
  };

  // --- Card CRUD ---
  const resetCardForm = () => {
    setCardType("flip");
    setCardQuestion("");
    setCardAnswer("");
    setCardExplanation("");
    setCardDifficulty("easy");
    setCardCoinPoints(1);
    setCardCategoryId("");
    setCardTopic("");
    setCardImageUrl("");
    setCardOptions([{ text: "", is_correct: false }, { text: "", is_correct: false }]);
    setCardEnabled(true);
  };

  const openCardDialog = (card?: FlashCard) => {
    if (card) {
      setEditingCard(card);
      setCardType(card.card_type);
      setCardQuestion(card.question);
      setCardAnswer(card.answer || "");
      setCardExplanation(card.explanation || "");
      setCardDifficulty(card.difficulty);
      setCardCoinPoints(card.coin_points);
      setCardCategoryId(card.category_id || "");
      setCardTopic(card.topic || "");
      setCardImageUrl(card.image_url || "");
      setCardOptions(card.options.length > 0 ? card.options : [{ text: "", is_correct: false }, { text: "", is_correct: false }]);
      setCardEnabled(card.is_enabled);
    } else {
      setEditingCard(null);
      resetCardForm();
    }
    setCardDialogOpen(true);
  };

  const saveCard = async () => {
    const payload: any = {
      card_type: cardType,
      question: cardQuestion,
      answer: cardType === "flip" ? cardAnswer : null,
      explanation: cardExplanation || null,
      difficulty: cardDifficulty,
      coin_points: cardCoinPoints,
      category_id: cardCategoryId || null,
      topic: cardTopic || null,
      image_url: cardImageUrl || null,
      is_enabled: cardEnabled,
      options: cardType !== "flip" ? cardOptions.filter((o) => o.text.trim()) : [],
      created_by: user?.id,
    };

    if (editingCard) {
      await supabase.from("flash_cards").update(payload).eq("id", editingCard.id);
    } else {
      await supabase.from("flash_cards").insert(payload);
    }
    setCardDialogOpen(false);
    toast({ title: "সংরক্ষিত হয়েছে" });
    void fetchAll();
  };

  const deleteCard = async (id: string) => {
    await supabase.from("flash_cards").delete().eq("id", id);
    toast({ title: "মুছে ফেলা হয়েছে" });
    void fetchAll();
  };

  const toggleCardEnabled = async (card: FlashCard) => {
    await supabase.from("flash_cards").update({ is_enabled: !card.is_enabled }).eq("id", card.id);
    void fetchAll();
  };

  const getCatName = (id: string | null) => categories.find((c) => c.id === id)?.name || "—";
  const typeLabels: Record<string, string> = { flip: "ফ্লিপ", mcq: "MCQ", true_false: "সত্য/মিথ্যা", image: "ইমেজ" };
  const diffLabels: Record<string, string> = { easy: "সহজ", medium: "মাঝারি", hard: "কঠিন" };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ফ্ল্যাশ কার্ড ম্যানেজমেন্ট</h1>

      <Tabs defaultValue="cards">
        <TabsList>
          <TabsTrigger value="cards" className="gap-1"><Layers className="h-4 w-4" /> কার্ড সমূহ</TabsTrigger>
          <TabsTrigger value="categories" className="gap-1"><FolderTree className="h-4 w-4" /> ক্যাটাগরি</TabsTrigger>
        </TabsList>

        {/* ---- CARDS TAB ---- */}
        <TabsContent value="cards" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openCardDialog()} className="gap-1"><Plus className="h-4 w-4" /> নতুন কার্ড</Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>প্রশ্ন</TableHead>
                    <TableHead>ধরন</TableHead>
                    <TableHead>কঠিনতা</TableHead>
                    <TableHead>কয়েন</TableHead>
                    <TableHead>ক্যাটাগরি</TableHead>
                    <TableHead>সক্রিয়</TableHead>
                    <TableHead className="text-right">একশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cards.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">কোনো কার্ড নেই</TableCell></TableRow>
                  ) : cards.map((card) => (
                    <TableRow key={card.id}>
                      <TableCell className="max-w-[200px] truncate">{card.question}</TableCell>
                      <TableCell><Badge variant="outline">{typeLabels[card.card_type] || card.card_type}</Badge></TableCell>
                      <TableCell>{diffLabels[card.difficulty]}</TableCell>
                      <TableCell>{card.coin_points}</TableCell>
                      <TableCell>{getCatName(card.category_id)}</TableCell>
                      <TableCell>
                        <Switch checked={card.is_enabled} onCheckedChange={() => void toggleCardEnabled(card)} />
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="icon" variant="ghost" onClick={() => openCardDialog(card)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => void deleteCard(card.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- CATEGORIES TAB ---- */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openCatDialog()} className="gap-1"><Plus className="h-4 w-4" /> নতুন ক্যাটাগরি</Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>নাম</TableHead>
                    <TableHead>বিবরণ</TableHead>
                    <TableHead>সক্রিয়</TableHead>
                    <TableHead className="text-right">একশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">কোনো ক্যাটাগরি নেই</TableCell></TableRow>
                  ) : categories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">{cat.description || "—"}</TableCell>
                      <TableCell>
                        <Switch checked={cat.is_active} onCheckedChange={() => void toggleCatActive(cat)} />
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="icon" variant="ghost" onClick={() => openCatDialog(cat)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => void deleteCat(cat.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ---- Category Dialog ---- */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCat ? "ক্যাটাগরি এডিট" : "নতুন ক্যাটাগরি"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>নাম</Label>
              <Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="যেমন: বাংলা ব্যাকরণ" />
            </div>
            <div className="space-y-2">
              <Label>বিবরণ</Label>
              <Textarea value={catDesc} onChange={(e) => setCatDesc(e.target.value)} rows={2} />
            </div>
            <Button onClick={() => void saveCat()} disabled={!catName.trim()} className="w-full">সংরক্ষণ করুন</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Card Dialog ---- */}
      <Dialog open={cardDialogOpen} onOpenChange={setCardDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingCard ? "কার্ড এডিট" : "নতুন ফ্ল্যাশ কার্ড"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>কার্ডের ধরন</Label>
                <Select value={cardType} onValueChange={setCardType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flip">ফ্লিপ কার্ড</SelectItem>
                    <SelectItem value="mcq">MCQ</SelectItem>
                    <SelectItem value="true_false">সত্য/মিথ্যা</SelectItem>
                    <SelectItem value="image">ইমেজ ভিত্তিক</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>কঠিনতা</Label>
                <Select value={cardDifficulty} onValueChange={setCardDifficulty}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">সহজ</SelectItem>
                    <SelectItem value="medium">মাঝারি</SelectItem>
                    <SelectItem value="hard">কঠিন</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>প্রশ্ন</Label>
              <Textarea value={cardQuestion} onChange={(e) => setCardQuestion(e.target.value)} rows={2} placeholder="প্রশ্নটি লিখুন..." />
            </div>

            {cardType === "flip" && (
              <div className="space-y-2">
                <Label>উত্তর</Label>
                <Textarea value={cardAnswer} onChange={(e) => setCardAnswer(e.target.value)} rows={2} placeholder="উত্তরটি লিখুন..." />
              </div>
            )}

            {cardType === "image" && (
              <div className="space-y-2">
                <Label>ইমেজ URL</Label>
                <Input value={cardImageUrl} onChange={(e) => setCardImageUrl(e.target.value)} placeholder="https://..." />
              </div>
            )}

            {(cardType === "mcq" || cardType === "true_false") && (
              <div className="space-y-3">
                <Label>অপশন সমূহ</Label>
                {cardOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={opt.text}
                      onChange={(e) => {
                        const newOpts = [...cardOptions];
                        newOpts[i] = { ...newOpts[i], text: e.target.value };
                        setCardOptions(newOpts);
                      }}
                      placeholder={`অপশন ${i + 1}`}
                      className="flex-1"
                    />
                    <label className="flex items-center gap-1 text-sm whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={opt.is_correct}
                        onChange={() => {
                          const newOpts = [...cardOptions];
                          newOpts[i] = { ...newOpts[i], is_correct: !newOpts[i].is_correct };
                          setCardOptions(newOpts);
                        }}
                      />
                      সঠিক
                    </label>
                    {cardOptions.length > 2 && (
                      <Button size="icon" variant="ghost" onClick={() => setCardOptions(cardOptions.filter((_, j) => j !== i))}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                {cardType === "mcq" && cardOptions.length < 6 && (
                  <Button variant="outline" size="sm" onClick={() => setCardOptions([...cardOptions, { text: "", is_correct: false }])}>
                    <Plus className="mr-1 h-3 w-3" /> অপশন যোগ করুন
                  </Button>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>ব্যাখ্যা (ঐচ্ছিক)</Label>
              <Textarea value={cardExplanation} onChange={(e) => setCardExplanation(e.target.value)} rows={2} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>কয়েন পয়েন্ট</Label>
                <Input type="number" min={0} value={cardCoinPoints} onChange={(e) => setCardCoinPoints(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>ক্যাটাগরি</Label>
                <Select value={cardCategoryId} onValueChange={setCardCategoryId}>
                  <SelectTrigger><SelectValue placeholder="বেছে নিন" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">কোনোটি নয়</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>টপিক</Label>
                <Input value={cardTopic} onChange={(e) => setCardTopic(e.target.value)} placeholder="যেমন: কারক" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={cardEnabled} onCheckedChange={setCardEnabled} />
              <Label>সক্রিয়</Label>
            </div>

            <Button onClick={() => void saveCard()} disabled={!cardQuestion.trim()} className="w-full">সংরক্ষণ করুন</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
