
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Enums, Tables, TablesInsert } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ImagePlus, Plus, Trash2, Pencil, CheckCircle2, BookOpen, FileText, Video } from "lucide-react";

type CourseCategory = Tables<"course_categories">;
type Course = Tables<"courses">;
type CourseLesson = Tables<"course_lessons">;
type LessonContent = Tables<"lesson_contents">;
type CourseStatus = Enums<"course_status">;
type LessonContentType = Enums<"lesson_content_type">;

const slugify = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export default function AdminCourses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const textEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const categorySectionRef = useRef<HTMLDivElement | null>(null);
  const courseSectionRef = useRef<HTMLDivElement | null>(null);
  const lessonSectionRef = useRef<HTMLDivElement | null>(null);
  const contentSectionRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [contents, setContents] = useState<LessonContent[]>([]);

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  const [categoryEditingId, setCategoryEditingId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categorySort, setCategorySort] = useState(0);

  const [courseEditingId, setCourseEditingId] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseSlug, setCourseSlug] = useState("");
  const [courseSummary, setCourseSummary] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseThumbnail, setCourseThumbnail] = useState("");
  const [courseCategoryId, setCourseCategoryId] = useState<string>("none");
  const [courseStatus, setCourseStatus] = useState<CourseStatus>("draft");

  const [lessonEditingId, setLessonEditingId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonSummary, setLessonSummary] = useState("");
  const [lessonPublished, setLessonPublished] = useState(false);

  const [contentEditingId, setContentEditingId] = useState<string | null>(null);
  const [contentType, setContentType] = useState<LessonContentType>("text");
  const [contentTitle, setContentTitle] = useState("");
  const [contentText, setContentText] = useState("");
  const [contentMediaUrl, setContentMediaUrl] = useState("");

  const selectedCourse = useMemo(() => courses.find((c) => c.id === selectedCourseId) || null, [courses, selectedCourseId]);
  const selectedLesson = useMemo(() => lessons.find((l) => l.id === selectedLessonId) || null, [lessons, selectedLessonId]);

  const fetchCategories = async () => {
    const { data } = await supabase.from("course_categories").select("*").order("sort_order");
    setCategories(data || []);
  };

  const fetchCourses = async () => {
    const { data } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
    setCourses(data || []);
  };

  const fetchLessons = async (courseId: string) => {
    const { data } = await supabase.from("course_lessons").select("*").eq("course_id", courseId).order("sort_order");
    setLessons(data || []);
  };

  const fetchContents = async (lessonId: string) => {
    const { data } = await supabase.from("lesson_contents").select("*").eq("lesson_id", lessonId).order("sort_order");
    setContents(data || []);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchCategories(), fetchCourses()]);
      setLoading(false);
    };
    void load();
  }, []);

  useEffect(() => {
    if (!selectedCourseId) {
      setLessons([]);
      setSelectedLessonId(null);
      return;
    }
    void fetchLessons(selectedCourseId);
  }, [selectedCourseId]);

  useEffect(() => {
    if (!selectedLessonId) {
      setContents([]);
      return;
    }
    void fetchContents(selectedLessonId);
  }, [selectedLessonId]);

  const resetCategoryForm = () => {
    setCategoryEditingId(null);
    setCategoryName("");
    setCategoryDescription("");
    setCategorySort(0);
  };

  const resetCourseForm = () => {
    setCourseEditingId(null);
    setCourseTitle("");
    setCourseSlug("");
    setCourseSummary("");
    setCourseDescription("");
    setCourseThumbnail("");
    setCourseCategoryId("none");
    setCourseStatus("draft");
  };

  const resetLessonForm = () => {
    setLessonEditingId(null);
    setLessonTitle("");
    setLessonSummary("");
    setLessonPublished(false);
  };

  const resetContentForm = () => {
    setContentEditingId(null);
    setContentType("text");
    setContentTitle("");
    setContentText("");
    setContentMediaUrl("");
  };

  const saveCategory = async () => {
    if (!categoryName.trim()) return toast({ title: "Category name is required", variant: "destructive" });
    const payload: TablesInsert<"course_categories"> = {
      name: categoryName.trim(),
      slug: slugify(categoryName),
      description: categoryDescription.trim() || null,
      sort_order: categorySort,
      is_active: true,
    };
    if (categoryEditingId) {
      const { error } = await supabase.from("course_categories").update(payload).eq("id", categoryEditingId);
      if (error) return toast({ title: "Category update failed", description: error.message, variant: "destructive" });
      toast({ title: "Category updated" });
    } else {
      const { error } = await supabase.from("course_categories").insert(payload);
      if (error) return toast({ title: "Category create failed", description: error.message, variant: "destructive" });
      toast({ title: "Category created" });
    }
    resetCategoryForm();
    await fetchCategories();
  };

  const saveCourse = async () => {
    if (!courseTitle.trim()) return toast({ title: "Course title is required", variant: "destructive" });
    const finalSlug = (courseSlug.trim() || slugify(courseTitle)).trim();
    if (!finalSlug) return toast({ title: "Valid slug is required", variant: "destructive" });

    const payload: TablesInsert<"courses"> = {
      title: courseTitle.trim(),
      slug: finalSlug,
      summary: courseSummary.trim() || null,
      description: courseDescription.trim() || null,
      thumbnail_url: courseThumbnail.trim() || null,
      category_id: courseCategoryId === "none" ? null : courseCategoryId,
      status: courseStatus,
      created_by: user?.id || null,
    };

    if (courseEditingId) {
      const { error } = await supabase.from("courses").update(payload).eq("id", courseEditingId);
      if (error) return toast({ title: "Course update failed", description: error.message, variant: "destructive" });
      toast({ title: "Course updated" });
    } else {
      const { error } = await supabase.from("courses").insert(payload);
      if (error) return toast({ title: "Course create failed", description: error.message, variant: "destructive" });
      toast({ title: "Course created" });
    }
    resetCourseForm();
    await fetchCourses();
  };

  const saveLesson = async () => {
    if (!selectedCourseId) return toast({ title: "Select a course first", variant: "destructive" });
    if (!lessonTitle.trim()) return toast({ title: "Lesson title is required", variant: "destructive" });

    const payload: TablesInsert<"course_lessons"> = {
      course_id: selectedCourseId,
      title: lessonTitle.trim(),
      summary: lessonSummary.trim() || null,
      is_published: lessonPublished,
      sort_order: lessonEditingId ? lessons.find((l) => l.id === lessonEditingId)?.sort_order || 0 : lessons.length,
    };

    if (lessonEditingId) {
      const { error } = await supabase.from("course_lessons").update(payload).eq("id", lessonEditingId);
      if (error) return toast({ title: "Lesson update failed", description: error.message, variant: "destructive" });
      toast({ title: "Lesson updated" });
    } else {
      const { error } = await supabase.from("course_lessons").insert(payload);
      if (error) return toast({ title: "Lesson create failed", description: error.message, variant: "destructive" });
      toast({ title: "Lesson created" });
    }
    resetLessonForm();
    await fetchLessons(selectedCourseId);
  };

  const saveContentBlock = async () => {
    if (!selectedLessonId) return toast({ title: "Select a lesson first", variant: "destructive" });
    if (contentType === "text" && !contentText.trim()) return toast({ title: "Text content is required", variant: "destructive" });
    if ((contentType === "image" || contentType === "video") && !contentMediaUrl.trim()) {
      return toast({ title: "Media URL is required", variant: "destructive" });
    }

    const payload: TablesInsert<"lesson_contents"> = {
      lesson_id: selectedLessonId,
      content_type: contentType,
      title: contentTitle.trim() || null,
      text_content: contentType === "text" ? contentText : null,
      media_url: contentType === "text" ? null : contentMediaUrl.trim(),
      sort_order: contentEditingId ? contents.find((c) => c.id === contentEditingId)?.sort_order || 0 : contents.length,
    };

    if (contentEditingId) {
      const { error } = await supabase.from("lesson_contents").update(payload).eq("id", contentEditingId);
      if (error) return toast({ title: "Content update failed", description: error.message, variant: "destructive" });
      toast({ title: "Content updated" });
    } else {
      const { error } = await supabase.from("lesson_contents").insert(payload);
      if (error) return toast({ title: "Content create failed", description: error.message, variant: "destructive" });
      toast({ title: "Content added" });
    }

    resetContentForm();
    await fetchContents(selectedLessonId);
  };

  const applyEditorTag = (open: string, close: string = open) => {
    const el = textEditorRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = contentText.slice(start, end);
    const next = `${contentText.slice(0, start)}${open}${selected}${close}${contentText.slice(end)}`;
    setContentText(next);
  };

  const contentTypeBadge = (type: LessonContentType) => {
    if (type === "image") return <Badge variant="secondary"><ImagePlus className="mr-1 h-3 w-3" /> Image</Badge>;
    if (type === "video") return <Badge variant="secondary"><Video className="mr-1 h-3 w-3" /> Video</Badge>;
    return <Badge variant="outline"><FileText className="mr-1 h-3 w-3" /> Text</Badge>;
  };

  const jumpTo = (ref: { current: HTMLDivElement | null }) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">কোর্স ম্যানেজমেন্ট</h1>
        <p className="text-sm text-muted-foreground">ওয়ার্কফ্লো: ক্যাটাগরি -&gt; কোর্স -&gt; লেসন -&gt; লেসন কন্টেন্ট (Text/Image/Video)</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-2 p-3">
          <Button type="button" variant="outline" size="sm" onClick={() => jumpTo(categorySectionRef)}>ক্যাটাগরি</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => jumpTo(courseSectionRef)}>এড কোর্স</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => jumpTo(lessonSectionRef)}>লেসন</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => jumpTo(contentSectionRef)}>লেসন কন্টেন্ট</Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          <div ref={categorySectionRef}>
          <Card>
            <CardHeader>
              <CardTitle>ক্যাটাগরি</CardTitle>
              <CardDescription>কোর্স ক্যাটাগরি তৈরি ও ম্যানেজ করুন।</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Sort</Label>
                  <Input type="number" value={categorySort} onChange={(e) => setCategorySort(Number(e.target.value || 0))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={categoryDescription} onChange={(e) => setCategoryDescription(e.target.value)} rows={2} />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => void saveCategory()}><Plus className="mr-2 h-4 w-4" />{categoryEditingId ? "Update" : "Add Category"}</Button>
                {categoryEditingId && <Button variant="outline" onClick={resetCategoryForm}>Cancel</Button>}
              </div>
              <div className="space-y-2 pt-2">
                {categories.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded border p-2">
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.slug}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setCategoryEditingId(c.id); setCategoryName(c.name); setCategoryDescription(c.description || ""); setCategorySort(c.sort_order); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={async () => {
                        if (!window.confirm("Delete this category?")) return;
                        const { error } = await supabase.from("course_categories").delete().eq("id", c.id);
                        if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
                        else { toast({ title: "Category deleted" }); void fetchCategories(); }
                      }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                {categories.length === 0 && <p className="text-sm text-muted-foreground">No categories yet.</p>}
              </div>
            </CardContent>
          </Card>
          </div>

          <div ref={courseSectionRef}>
          <Card>
            <CardHeader>
              <CardTitle>এড কোর্স</CardTitle>
              <CardDescription>কোর্সের শিরোনাম, স্ট্যাটাস, ক্যাটাগরি ও থাম্বনেইল সেট করুন।</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Course Title</Label>
                <Input value={courseTitle} onChange={(e) => { setCourseTitle(e.target.value); if (!courseEditingId) setCourseSlug(slugify(e.target.value)); }} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label>Slug</Label><Input value={courseSlug} onChange={(e) => setCourseSlug(slugify(e.target.value))} /></div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={courseStatus} onValueChange={(v) => setCourseStatus(v as CourseStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">Published</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={courseCategoryId} onValueChange={setCourseCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Thumbnail URL</Label><Input value={courseThumbnail} onChange={(e) => setCourseThumbnail(e.target.value)} placeholder="https://..." /></div>
              {courseThumbnail && <div className="overflow-hidden rounded border"><img src={courseThumbnail} alt="thumbnail" className="h-28 w-full object-cover" /></div>}
              <div className="space-y-2"><Label>Short Summary</Label><Textarea value={courseSummary} onChange={(e) => setCourseSummary(e.target.value)} rows={2} /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={courseDescription} onChange={(e) => setCourseDescription(e.target.value)} rows={3} /></div>
              <div className="flex gap-2">
                <Button onClick={() => void saveCourse()}><Plus className="mr-2 h-4 w-4" />{courseEditingId ? "Update Course" : "Create Course"}</Button>
                {courseEditingId && <Button variant="outline" onClick={resetCourseForm}>Cancel</Button>}
              </div>
              <div className="space-y-2 border-t pt-3">
                {courses.map((c) => (
                  <div key={c.id} className={`rounded border p-3 ${selectedCourseId === c.id ? "border-primary bg-primary/5" : ""}`}>
                    <div className="flex items-start justify-between gap-2"><div><p className="text-sm font-semibold">{c.title}</p><p className="text-xs text-muted-foreground">{c.slug}</p></div><Badge variant={c.status === "published" ? "default" : "secondary"}>{c.status}</Badge></div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setSelectedCourseId(c.id); setSelectedLessonId(null); }}><BookOpen className="mr-1 h-3 w-3" /> Open</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setCourseEditingId(c.id); setCourseTitle(c.title); setCourseSlug(c.slug); setCourseSummary(c.summary || ""); setCourseDescription(c.description || ""); setCourseThumbnail(c.thumbnail_url || ""); setCourseCategoryId(c.category_id || "none"); setCourseStatus(c.status); }}><Pencil className="mr-1 h-3 w-3" /> Edit</Button>
                      <Button size="sm" variant="ghost" onClick={async () => {
                        if (!window.confirm("Delete this course?")) return;
                        const { error } = await supabase.from("courses").delete().eq("id", c.id);
                        if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
                        else { toast({ title: "Course deleted" }); if (selectedCourseId === c.id) { setSelectedCourseId(null); setSelectedLessonId(null); } void fetchCourses(); }
                      }}><Trash2 className="mr-1 h-3 w-3 text-destructive" /> Delete</Button>
                    </div>
                  </div>
                ))}
                {courses.length === 0 && <p className="text-sm text-muted-foreground">No courses yet.</p>}
              </div>
            </CardContent>
          </Card>
          </div>

          <div ref={lessonSectionRef}>
          <Card>
            <CardHeader>
              <CardTitle>লেসন</CardTitle>
              <CardDescription>{selectedCourse ? `নির্বাচিত কোর্স: ${selectedCourse.title}` : "আগে একটি কোর্স সিলেক্ট করুন।"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2"><Label>Lesson Title</Label><Input value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} disabled={!selectedCourseId} /></div>
              <div className="space-y-2"><Label>Lesson Summary</Label><Textarea value={lessonSummary} onChange={(e) => setLessonSummary(e.target.value)} rows={2} disabled={!selectedCourseId} /></div>
              <div className="flex items-center gap-2"><input id="lesson_published" type="checkbox" checked={lessonPublished} onChange={(e) => setLessonPublished(e.target.checked)} disabled={!selectedCourseId} /><Label htmlFor="lesson_published">Publish lesson</Label></div>
              <div className="flex gap-2"><Button onClick={() => void saveLesson()} disabled={!selectedCourseId}><Plus className="mr-2 h-4 w-4" />{lessonEditingId ? "Update Lesson" : "Add Lesson"}</Button>{lessonEditingId && <Button variant="outline" onClick={resetLessonForm}>Cancel</Button>}</div>
              <div className="space-y-2 border-t pt-3">
                {lessons.map((l) => (
                  <div key={l.id} className={`rounded border p-3 ${selectedLessonId === l.id ? "border-primary bg-primary/5" : ""}`}>
                    <div className="flex items-start justify-between"><div><p className="text-sm font-semibold">{l.title}</p><p className="text-xs text-muted-foreground">{l.summary || "No summary"}</p></div>{l.is_published && <Badge variant="default"><CheckCircle2 className="mr-1 h-3 w-3" />Published</Badge>}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedLessonId(l.id)}>Open</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setLessonEditingId(l.id); setLessonTitle(l.title); setLessonSummary(l.summary || ""); setLessonPublished(l.is_published); }}><Pencil className="mr-1 h-3 w-3" /> Edit</Button>
                      <Button size="sm" variant="ghost" onClick={async () => {
                        if (!window.confirm("Delete this lesson?")) return;
                        const { error } = await supabase.from("course_lessons").delete().eq("id", l.id);
                        if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
                        else if (selectedCourseId) { toast({ title: "Lesson deleted" }); if (selectedLessonId === l.id) setSelectedLessonId(null); void fetchLessons(selectedCourseId); }
                      }}><Trash2 className="mr-1 h-3 w-3 text-destructive" /> Delete</Button>
                    </div>
                  </div>
                ))}
                {selectedCourseId && lessons.length === 0 && <p className="text-sm text-muted-foreground">No lessons for this course yet.</p>}
              </div>
            </CardContent>
          </Card>
          </div>

          <div ref={contentSectionRef}>
          <Card>
            <CardHeader>
              <CardTitle>লেসন কন্টেন্ট</CardTitle>
              <CardDescription>{selectedLesson ? `নির্বাচিত লেসন: ${selectedLesson.title}` : "আগে একটি লেসন সিলেক্ট করুন।"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Content Type</Label>
                <Select value={contentType} onValueChange={(v) => setContentType(v as LessonContentType)} disabled={!selectedLessonId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="text">Text</SelectItem><SelectItem value="image">Image</SelectItem><SelectItem value="video">Video</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Content Title</Label><Input value={contentTitle} onChange={(e) => setContentTitle(e.target.value)} disabled={!selectedLessonId} /></div>
              {contentType === "text" ? (
                <div className="space-y-2">
                  <Label>Text Editor</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => applyEditorTag("<b>", "</b>")} disabled={!selectedLessonId}>Bold</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => applyEditorTag("<i>", "</i>")} disabled={!selectedLessonId}>Italic</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => applyEditorTag("<h3>", "</h3>")} disabled={!selectedLessonId}>Heading</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => applyEditorTag("<ul><li>", "</li></ul>")} disabled={!selectedLessonId}>List</Button>
                  </div>
                  <Textarea ref={textEditorRef} rows={6} value={contentText} onChange={(e) => setContentText(e.target.value)} placeholder="Write text or HTML..." disabled={!selectedLessonId} />
                </div>
              ) : (
                <div className="space-y-2"><Label>{contentType === "image" ? "Image URL" : "Video URL (YouTube/MP4)"}</Label><Input value={contentMediaUrl} onChange={(e) => setContentMediaUrl(e.target.value)} disabled={!selectedLessonId} /></div>
              )}
              <div className="flex gap-2"><Button onClick={() => void saveContentBlock()} disabled={!selectedLessonId}><Plus className="mr-2 h-4 w-4" />{contentEditingId ? "Update Content" : "Add Content"}</Button>{contentEditingId && <Button variant="outline" onClick={resetContentForm}>Cancel</Button>}</div>
              <div className="space-y-2 border-t pt-3">
                {contents.map((c) => (
                  <div key={c.id} className="rounded border p-3">
                    <div className="flex items-center justify-between">
                      <div><p className="text-sm font-semibold">{c.title || "Untitled block"}</p><div className="mt-1">{contentTypeBadge(c.content_type)}</div></div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setContentEditingId(c.id); setContentType(c.content_type); setContentTitle(c.title || ""); setContentText(c.text_content || ""); setContentMediaUrl(c.media_url || ""); }}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={async () => {
                          if (!window.confirm("Delete this content block?")) return;
                          const { error } = await supabase.from("lesson_contents").delete().eq("id", c.id);
                          if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
                          else if (selectedLessonId) { toast({ title: "Content deleted" }); void fetchContents(selectedLessonId); }
                        }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                    {c.content_type === "text" && c.text_content && <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{c.text_content}</p>}
                    {(c.content_type === "image" || c.content_type === "video") && c.media_url && <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">{c.media_url}</p>}
                  </div>
                ))}
                {selectedLessonId && contents.length === 0 && <p className="text-sm text-muted-foreground">No content blocks in this lesson yet.</p>}
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      )}
    </div>
  );
}

