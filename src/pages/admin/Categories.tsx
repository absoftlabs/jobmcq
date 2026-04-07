import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import {
  loadQuestionTaxonomy,
  normalizeName,
  slugifyName,
  type QuestionCategoryRow,
  type QuestionSubcategoryRow,
} from "@/lib/question-taxonomy";

export default function AdminCategories() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<QuestionCategoryRow[]>([]);
  const [subcategories, setSubcategories] = useState<QuestionSubcategoryRow[]>([]);

  const [categoryName, setCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<QuestionCategoryRow | null>(null);

  const [subcategoryName, setSubcategoryName] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [editingSubcategory, setEditingSubcategory] = useState<QuestionSubcategoryRow | null>(null);

  const fetchTaxonomy = async () => {
    setLoading(true);
    try {
      const data = await loadQuestionTaxonomy();
      setCategories(data.categories);
      setSubcategories(data.subcategories);
      if (!selectedCategoryId && data.categories[0]) {
        setSelectedCategoryId(data.categories[0].id);
      }
    } catch (error) {
      toast({
        title: "ক্যাটাগরি লোড হয়নি",
        description: error instanceof Error ? error.message : "অজানা সমস্যা হয়েছে।",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTaxonomy();
  }, []);

  const groupedSubcategories = useMemo(() => {
    return categories.map((category) => ({
      category,
      items: subcategories.filter((subcategory) => subcategory.category_id === category.id),
    }));
  }, [categories, subcategories]);

  const resetCategoryForm = () => {
    setCategoryName("");
    setEditingCategory(null);
  };

  const resetSubcategoryForm = () => {
    setSubcategoryName("");
    setEditingSubcategory(null);
  };

  const handleSaveCategory = async () => {
    const name = normalizeName(categoryName);

    if (!name) {
      toast({ title: "ক্যাটাগরির নাম দিন", variant: "destructive" });
      return;
    }

    const payload = {
      name,
      slug: slugifyName(name),
    };

    try {
      if (editingCategory) {
        const { error } = await supabase.from("question_categories").update(payload).eq("id", editingCategory.id);
        if (error) throw error;
        toast({ title: "ক্যাটাগরি আপডেট হয়েছে" });
      } else {
        const { error } = await supabase.from("question_categories").insert(payload);
        if (error) throw error;
        toast({ title: "ক্যাটাগরি যোগ হয়েছে" });
      }

      resetCategoryForm();
      await fetchTaxonomy();
    } catch (error) {
      toast({
        title: "ক্যাটাগরি সংরক্ষণ ব্যর্থ",
        description: error instanceof Error ? error.message : "অজানা সমস্যা হয়েছে।",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const { error } = await supabase.from("question_categories").delete().eq("id", categoryId);
      if (error) throw error;
      toast({ title: "ক্যাটাগরি মুছে ফেলা হয়েছে" });
      await fetchTaxonomy();
    } catch (error) {
      toast({
        title: "ক্যাটাগরি ডিলিট ব্যর্থ",
        description: error instanceof Error ? error.message : "অজানা সমস্যা হয়েছে।",
        variant: "destructive",
      });
    }
  };

  const handleSaveSubcategory = async () => {
    const name = normalizeName(subcategoryName);

    if (!selectedCategoryId) {
      toast({ title: "একটি ক্যাটাগরি নির্বাচন করুন", variant: "destructive" });
      return;
    }

    if (!name) {
      toast({ title: "সাব ক্যাটাগরির নাম দিন", variant: "destructive" });
      return;
    }

    const payload = {
      category_id: selectedCategoryId,
      name,
      slug: slugifyName(name),
    };

    try {
      if (editingSubcategory) {
        const { error } = await supabase.from("question_subcategories").update(payload).eq("id", editingSubcategory.id);
        if (error) throw error;
        toast({ title: "সাব ক্যাটাগরি আপডেট হয়েছে" });
      } else {
        const { error } = await supabase.from("question_subcategories").insert(payload);
        if (error) throw error;
        toast({ title: "সাব ক্যাটাগরি যোগ হয়েছে" });
      }

      resetSubcategoryForm();
      await fetchTaxonomy();
    } catch (error) {
      toast({
        title: "সাব ক্যাটাগরি সংরক্ষণ ব্যর্থ",
        description: error instanceof Error ? error.message : "অজানা সমস্যা হয়েছে।",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSubcategory = async (subcategoryId: string) => {
    try {
      const { error } = await supabase.from("question_subcategories").delete().eq("id", subcategoryId);
      if (error) throw error;
      toast({ title: "সাব ক্যাটাগরি মুছে ফেলা হয়েছে" });
      await fetchTaxonomy();
    } catch (error) {
      toast({
        title: "সাব ক্যাটাগরি ডিলিট ব্যর্থ",
        description: error instanceof Error ? error.message : "অজানা সমস্যা হয়েছে।",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
        <CardContent className="p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-primary/80">Question Taxonomy</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">ক্যাটাগরি ও সাব ক্যাটাগরি</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            প্রশ্ন ব্যাংকের জন্য category এবং subcategory আলাদা করে ম্যানেজ করুন। এই তালিকা থেকেই প্রশ্ন add form
            ও CSV upload map হবে।
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>ক্যাটাগরি</CardTitle>
            <CardDescription>মূল বিষয়ভিত্তিক গ্রুপ যোগ, আপডেট বা ডিলিট করুন</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1 space-y-2">
                <Label htmlFor="category-name">ক্যাটাগরির নাম</Label>
                <Input
                  id="category-name"
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                  placeholder="যেমন: বাংলা"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={handleSaveCategory}>
                  <Plus className="mr-2 h-4 w-4" />
                  {editingCategory ? "আপডেট" : "যোগ করুন"}
                </Button>
                {editingCategory ? (
                  <Button variant="outline" onClick={resetCategoryForm}>
                    বাতিল
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>নাম</TableHead>
                      <TableHead className="w-28">সাব ক্যাটাগরি</TableHead>
                      <TableHead className="w-24">অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          এখনো কোনো ক্যাটাগরি নেই
                        </TableCell>
                      </TableRow>
                    ) : (
                      categories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium">{category.name}</TableCell>
                          <TableCell>
                            {subcategories.filter((item) => item.category_id === category.id).length}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingCategory(category);
                                  setCategoryName(category.name);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => void handleDeleteCategory(category.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>সাব ক্যাটাগরি</CardTitle>
            <CardDescription>প্রতিটি category-এর অধীনে subcategory ম্যানেজ করুন</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <div className="space-y-2">
                <Label>ক্যাটাগরি</Label>
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="ক্যাটাগরি নির্বাচন করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subcategory-name">সাব ক্যাটাগরির নাম</Label>
                <Input
                  id="subcategory-name"
                  value={subcategoryName}
                  onChange={(event) => setSubcategoryName(event.target.value)}
                  placeholder="যেমন: ব্যাকরণ"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={handleSaveSubcategory}>
                  <Plus className="mr-2 h-4 w-4" />
                  {editingSubcategory ? "আপডেট" : "যোগ করুন"}
                </Button>
                {editingSubcategory ? (
                  <Button variant="outline" onClick={resetSubcategoryForm}>
                    বাতিল
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="space-y-4">
              {groupedSubcategories.length === 0 ? (
                <div className="rounded-xl border py-10 text-center text-muted-foreground">
                  আগে একটি category তৈরি করুন
                </div>
              ) : (
                groupedSubcategories.map(({ category, items }) => (
                  <div key={category.id} className="rounded-xl border">
                    <div className="border-b bg-muted/40 px-4 py-3">
                      <p className="font-semibold">{category.name}</p>
                    </div>
                    <div className="divide-y">
                      {items.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-muted-foreground">এখনো কোনো subcategory নেই</div>
                      ) : (
                        items.map((subcategory) => (
                          <div key={subcategory.id} className="flex items-center justify-between px-4 py-3">
                            <span className="text-sm">{subcategory.name}</span>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingSubcategory(subcategory);
                                  setSelectedCategoryId(subcategory.category_id);
                                  setSubcategoryName(subcategory.name);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => void handleDeleteSubcategory(subcategory.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
