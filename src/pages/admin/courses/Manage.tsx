import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Enums, Tables, TablesInsert } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ImagePlus, Pencil, Plus, Trash2, Upload, Users } from "lucide-react";

type Course = Tables<"courses">;
type CourseCategory = Tables<"course_categories">;
type CourseStatus = Enums<"course_status">;

const slugify = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export default function AdminManageCourses() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseEnrollmentCounts, setCourseEnrollmentCounts] = useState<Record<string, number>>({});

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<CourseStatus>("draft");
  const [categoryId, setCategoryId] = useState<string>("none");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState("0");

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const fetchData = async () => {
    const [{ data: cats }, { data: items }] = await Promise.all([
      supabase.from("course_categories").select("*").order("sort_order"),
      supabase.from("courses").select("*").order("created_at", { ascending: false }),
    ]);
    setCategories(cats || []);
    const courseRows = items || [];
    setCourses(courseRows);

    const courseIds = courseRows.map((course) => course.id);
    if (courseIds.length === 0) {
      setCourseEnrollmentCounts({});
      return;
    }

    const { data: enrollments } = await supabase
      .from("course_enrollments")
      .select("course_id")
      .in("course_id", courseIds);

    const counts: Record<string, number> = {};
    (enrollments || []).forEach((item) => {
      counts[item.course_id] = (counts[item.course_id] || 0) + 1;
    });
    setCourseEnrollmentCounts(counts);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    };
    void load();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setSlug("");
    setSummary("");
    setDescription("");
    setStatus("draft");
    setCategoryId("none");
    setThumbnailUrl("");
    setIsPaid(false);
    setPrice("0");
  };

  const uploadThumbnail = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const safeExt = ["png", "jpg", "jpeg", "webp"].includes(ext) ? ext : "jpg";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;
      const { error } = await supabase.storage.from("course-thumbnails").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) {
        toast({ title: "থাম্বনেইল আপলোড ব্যর্থ", description: error.message, variant: "destructive" });
        return;
      }
      const { data } = supabase.storage.from("course-thumbnails").getPublicUrl(path);
      setThumbnailUrl(data.publicUrl);
      toast({ title: "থাম্বনেইল আপলোড হয়েছে" });
    } finally {
      setUploading(false);
    }
  };

  const saveCourse = async () => {
    if (!title.trim()) {
      toast({ title: "কোর্সের শিরোনাম দিন", variant: "destructive" });
      return;
    }
    const finalSlug = slug.trim() || slugify(title);
    if (!finalSlug) {
      toast({ title: "সঠিক slug দিন", variant: "destructive" });
      return;
    }
    if (isPaid && Number(price || 0) <= 0) {
      toast({ title: "পেইড কোর্সের জন্য প্রাইজ ০ এর বেশি দিন", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload: TablesInsert<"courses"> = {
      title: title.trim(),
      slug: finalSlug,
      summary: summary.trim() || null,
      description: description.trim() || null,
      category_id: categoryId === "none" ? null : categoryId,
      status,
      thumbnail_url: thumbnailUrl.trim() || null,
      is_paid: isPaid,
      price: isPaid ? Number(price || 0) : 0,
      currency: "BDT",
      created_by: user?.id || null,
    };

    if (editingId) {
      const { error } = await supabase.from("courses").update(payload).eq("id", editingId);
      if (error) {
        setSaving(false);
        toast({ title: "কোর্স আপডেট ব্যর্থ", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "কোর্স আপডেট হয়েছে" });
    } else {
      const { error } = await supabase.from("courses").insert(payload);
      if (error) {
        setSaving(false);
        toast({ title: "কোর্স তৈরি ব্যর্থ", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "কোর্স তৈরি হয়েছে" });
    }

    setSaving(false);
    resetForm();
    await fetchData();
  };

  const editCourse = (course: Course) => {
    setEditingId(course.id);
    setTitle(course.title);
    setSlug(course.slug);
    setSummary(course.summary || "");
    setDescription(course.description || "");
    setStatus(course.status);
    setCategoryId(course.category_id || "none");
    setThumbnailUrl(course.thumbnail_url || "");
    setIsPaid(course.is_paid);
    setPrice(String(course.price ?? 0));
  };

  const deleteCourse = async (id: string) => {
    if (!window.confirm("এই কোর্স ডিলেট করতে চান?")) return;
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) {
      toast({ title: "ডিলেট ব্যর্থ", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "কোর্স ডিলেট হয়েছে" });
    await fetchData();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">এড কোর্স</h1>
        <p className="text-sm text-muted-foreground">নতুন কোর্স তৈরি, থাম্বনেইল আপলোড, এডিট ও ডিলেট করুন।</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "কোর্স এডিট" : "নতুন কোর্স তৈরি"}</CardTitle>
          <CardDescription>থাম্বনেইল URL সরাসরি দিতে পারেন, অথবা ফাইল আপলোড করতে পারেন।</CardDescription>
        </CardHeader>
                <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>কোর্স শিরোনাম</Label>
              <Input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!editingId) setSlug(slugify(e.target.value));
                }}
                placeholder="যেমন: ব্যাংক জব প্রিলিমিনারি কোর্স"
              />
            </div>

            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} />
            </div>

            <div className="space-y-2">
              <Label>স্ট্যাটাস</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as CourseStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ক্যাটাগরি</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="ক্যাটাগরি সিলেক্ট করুন" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>কোর্স টাইপ</Label>
              <Select value={isPaid ? "paid" : "free"} onValueChange={(v) => setIsPaid(v === "paid")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">ফ্রি</SelectItem>
                  <SelectItem value="paid">পেইড</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>প্রাইজ (BDT)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={!isPaid}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>থাম্বনেইল আপলোড</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadThumbnail(file);
                  }}
                />
                <Button type="button" variant="outline" disabled={uploading}>
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>থাম্বনেইল URL</Label>
              <Input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="https://..." />
            </div>

            <div className="space-y-2">
              <Label>সংক্ষিপ্ত বিবরণ</Label>
              <Textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>বিস্তারিত বিবরণ</Label>
              <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>

          {thumbnailUrl && (
            <div className="overflow-hidden rounded-lg border">
              <img src={thumbnailUrl} alt="thumbnail preview" className="h-36 w-full object-cover" />
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={() => void saveCourse()} disabled={saving || uploading}>
              <Plus className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : editingId ? "কোর্স আপডেট" : "কোর্স তৈরি"}
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
          <CardTitle>কোর্স লিস্ট</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">লোড হচ্ছে...</p>
          ) : courses.length === 0 ? (
            <p className="text-sm text-muted-foreground">কোনো কোর্স নেই</p>
          ) : (
            courses.map((course) => (
              <div key={course.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="h-14 w-20 overflow-hidden rounded border">
                      {course.thumbnail_url ? (
                        <img src={course.thumbnail_url} alt={course.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <ImagePlus className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{course.title}</p>
                      <p className="text-xs text-muted-foreground">{course.slug}</p>
                      <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {courseEnrollmentCounts[course.id] || 0} জন এনরোলড
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {course.is_paid ? `পেইড - ৳${Number(course.price || 0).toFixed(2)}` : "ফ্রি কোর্স"}
                      </p>
                      {course.category_id && (
                        <p className="text-xs text-muted-foreground">
                          Category: {categoryMap.get(course.category_id) || "Unknown"}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={course.status === "published" ? "default" : "secondary"}>{course.status}</Badge>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => editCourse(course)}>
                    <Pencil className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void deleteCourse(course.id)}>
                    <Trash2 className="mr-1 h-3 w-3 text-destructive" />
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

