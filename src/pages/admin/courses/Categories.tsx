import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Plus, Trash2 } from "lucide-react";

type CourseCategory = Tables<"course_categories">;

const slugify = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export default function AdminCourseCategories() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CourseCategory[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(0);

  const fetchCategories = async () => {
    const { data } = await supabase.from("course_categories").select("*").order("sort_order");
    setCategories(data || []);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchCategories();
      setLoading(false);
    };
    void load();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setSortOrder(0);
  };

  const saveCategory = async () => {
    if (!name.trim()) {
      toast({ title: "ক্যাটাগরির নাম দিন", variant: "destructive" });
      return;
    }

    const payload: TablesInsert<"course_categories"> = {
      name: name.trim(),
      slug: slugify(name),
      description: description.trim() || null,
      sort_order: sortOrder,
      is_active: true,
    };

    if (editingId) {
      const { error } = await supabase.from("course_categories").update(payload).eq("id", editingId);
      if (error) {
        toast({ title: "আপডেট ব্যর্থ", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "ক্যাটাগরি আপডেট হয়েছে" });
    } else {
      const { error } = await supabase.from("course_categories").insert(payload);
      if (error) {
        toast({ title: "তৈরি ব্যর্থ", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "ক্যাটাগরি তৈরি হয়েছে" });
    }

    resetForm();
    await fetchCategories();
  };

  const editCategory = (cat: CourseCategory) => {
    setEditingId(cat.id);
    setName(cat.name);
    setDescription(cat.description || "");
    setSortOrder(cat.sort_order);
  };

  const deleteCategory = async (id: string) => {
    if (!window.confirm("এই ক্যাটাগরি ডিলেট করতে চান?")) return;
    const { error } = await supabase.from("course_categories").delete().eq("id", id);
    if (error) {
      toast({ title: "ডিলেট ব্যর্থ", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "ক্যাটাগরি ডিলেট হয়েছে" });
    await fetchCategories();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">কোর্স ক্যাটাগরি</h1>
        <p className="text-sm text-muted-foreground">এখান থেকে কোর্সের ক্যাটাগরি তৈরি ও ম্যানেজ করুন।</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "ক্যাটাগরি এডিট" : "নতুন ক্যাটাগরি"}</CardTitle>
            <CardDescription>নাম দিলে slug স্বয়ংক্রিয়ভাবে তৈরি হবে।</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>নাম</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="যেমন: বাংলা" />
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value || 0))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>বিবরণ</Label>
              <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => void saveCategory()}>
                <Plus className="mr-2 h-4 w-4" />
                {editingId ? "আপডেট করুন" : "ক্যাটাগরি যোগ করুন"}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ক্যাটাগরি লিস্ট</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">লোড হচ্ছে...</p>
            ) : categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">কোনো ক্যাটাগরি নেই</p>
            ) : (
              categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-semibold">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">{cat.slug}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => editCategory(cat)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => void deleteCategory(cat.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
