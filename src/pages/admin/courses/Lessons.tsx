import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Enums, Tables, TablesInsert } from "@/integrations/supabase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, FileText, ImagePlus, Pencil, Plus, Trash2, Video } from "lucide-react";

type Course = Tables<"courses">;
type CourseLesson = Tables<"course_lessons">;
type LessonContent = Tables<"lesson_contents">;
type LessonContentType = Enums<"lesson_content_type">;

export default function AdminCourseLessons() {
  const { toast } = useToast();
  const textEditorRef = useRef<HTMLTextAreaElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [contents, setContents] = useState<LessonContent[]>([]);

  const [selectedCourseId, setSelectedCourseId] = useState<string>("none");
  const [selectedLessonId, setSelectedLessonId] = useState<string>("none");

  const [lessonEditingId, setLessonEditingId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonSummary, setLessonSummary] = useState("");
  const [lessonPublished, setLessonPublished] = useState(false);

  const [contentEditingId, setContentEditingId] = useState<string | null>(null);
  const [contentType, setContentType] = useState<LessonContentType>("text");
  const [contentTitle, setContentTitle] = useState("");
  const [contentText, setContentText] = useState("");
  const [contentMediaUrl, setContentMediaUrl] = useState("");

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) || null,
    [courses, selectedCourseId],
  );
  const selectedLesson = useMemo(
    () => lessons.find((l) => l.id === selectedLessonId) || null,
    [lessons, selectedLessonId],
  );

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
      await fetchCourses();
      setLoading(false);
    };
    void load();
  }, []);

  useEffect(() => {
    if (selectedCourseId === "none") {
      setLessons([]);
      setSelectedLessonId("none");
      return;
    }
    void fetchLessons(selectedCourseId);
  }, [selectedCourseId]);

  useEffect(() => {
    if (selectedLessonId === "none") {
      setContents([]);
      return;
    }
    void fetchContents(selectedLessonId);
  }, [selectedLessonId]);

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

  const saveLesson = async () => {
    if (selectedCourseId === "none") {
      toast({ title: "আগে একটি কোর্স সিলেক্ট করুন", variant: "destructive" });
      return;
    }
    if (!lessonTitle.trim()) {
      toast({ title: "লেসনের শিরোনাম দিন", variant: "destructive" });
      return;
    }

    const payload: TablesInsert<"course_lessons"> = {
      course_id: selectedCourseId,
      title: lessonTitle.trim(),
      summary: lessonSummary.trim() || null,
      is_published: lessonPublished,
      sort_order: lessonEditingId ? lessons.find((l) => l.id === lessonEditingId)?.sort_order || 0 : lessons.length,
    };

    if (lessonEditingId) {
      const { error } = await supabase.from("course_lessons").update(payload).eq("id", lessonEditingId);
      if (error) {
        toast({ title: "লেসন আপডেট ব্যর্থ", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "লেসন আপডেট হয়েছে" });
    } else {
      const { error } = await supabase.from("course_lessons").insert(payload);
      if (error) {
        toast({ title: "লেসন তৈরি ব্যর্থ", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "লেসন তৈরি হয়েছে" });
    }

    resetLessonForm();
    await fetchLessons(selectedCourseId);
  };

  const deleteLesson = async (id: string) => {
    if (!window.confirm("এই লেসন ডিলেট করতে চান?")) return;
    const { error } = await supabase.from("course_lessons").delete().eq("id", id);
    if (error) {
      toast({ title: "ডিলেট ব্যর্থ", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "লেসন ডিলেট হয়েছে" });
    if (selectedCourseId !== "none") await fetchLessons(selectedCourseId);
  };

  const saveContent = async () => {
    if (selectedLessonId === "none") {
      toast({ title: "আগে একটি লেসন সিলেক্ট করুন", variant: "destructive" });
      return;
    }
    if (contentType === "text" && !contentText.trim()) {
      toast({ title: "টেক্সট কন্টেন্ট দিন", variant: "destructive" });
      return;
    }
    if ((contentType === "image" || contentType === "video") && !contentMediaUrl.trim()) {
      toast({ title: "মিডিয়া URL দিন", variant: "destructive" });
      return;
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
      if (error) {
        toast({ title: "কন্টেন্ট আপডেট ব্যর্থ", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "কন্টেন্ট আপডেট হয়েছে" });
    } else {
      const { error } = await supabase.from("lesson_contents").insert(payload);
      if (error) {
        toast({ title: "কন্টেন্ট যোগ ব্যর্থ", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "কন্টেন্ট যোগ হয়েছে" });
    }

    resetContentForm();
    await fetchContents(selectedLessonId);
  };

  const deleteContent = async (id: string) => {
    if (!window.confirm("এই কন্টেন্ট ডিলেট করতে চান?")) return;
    const { error } = await supabase.from("lesson_contents").delete().eq("id", id);
    if (error) {
      toast({ title: "ডিলেট ব্যর্থ", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "কন্টেন্ট ডিলেট হয়েছে" });
    if (selectedLessonId !== "none") await fetchContents(selectedLessonId);
  };

  const applyTag = (open: string, close: string = open) => {
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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">লেসন ম্যানেজমেন্ট</h1>
        <p className="text-sm text-muted-foreground">কোর্স নির্বাচন করে লেসন এবং লেসনের ভিতরে কন্টেন্ট যুক্ত করুন।</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>কোর্স নির্বাচন</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
            <SelectTrigger>
              <SelectValue placeholder="কোর্স সিলেক্ট করুন" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">কোর্স সিলেক্ট করুন</SelectItem>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedCourse && <p className="mt-2 text-sm text-muted-foreground">নির্বাচিত কোর্স: {selectedCourse.title}</p>}
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>লেসন</CardTitle>
            <CardDescription>{selectedCourse ? "লেসন যোগ/এডিট/ডিলেট করুন" : "আগে কোর্স সিলেক্ট করুন"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>লেসনের শিরোনাম</Label>
              <Input value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} disabled={selectedCourseId === "none"} />
            </div>
            <div className="space-y-2">
              <Label>লেসন Summary</Label>
              <Textarea rows={2} value={lessonSummary} onChange={(e) => setLessonSummary(e.target.value)} disabled={selectedCourseId === "none"} />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="lesson_published"
                type="checkbox"
                checked={lessonPublished}
                onChange={(e) => setLessonPublished(e.target.checked)}
                disabled={selectedCourseId === "none"}
              />
              <Label htmlFor="lesson_published">Publish lesson</Label>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => void saveLesson()} disabled={selectedCourseId === "none"}>
                <Plus className="mr-2 h-4 w-4" />
                {lessonEditingId ? "লেসন আপডেট" : "লেসন যোগ"}
              </Button>
              {lessonEditingId && <Button variant="outline" onClick={resetLessonForm}>Cancel</Button>}
            </div>

            <div className="space-y-2 border-t pt-3">
              {lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className={`rounded-lg border p-3 ${selectedLessonId === lesson.id ? "border-primary bg-primary/5" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{lesson.title}</p>
                      <p className="text-xs text-muted-foreground">{lesson.summary || "No summary"}</p>
                    </div>
                    {lesson.is_published && (
                      <Badge variant="default">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Published
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelectedLessonId(lesson.id)}>
                      Open
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setLessonEditingId(lesson.id);
                        setLessonTitle(lesson.title);
                        setLessonSummary(lesson.summary || "");
                        setLessonPublished(lesson.is_published);
                      }}
                    >
                      <Pencil className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void deleteLesson(lesson.id)}>
                      <Trash2 className="mr-1 h-3 w-3 text-destructive" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
              {selectedCourseId !== "none" && lessons.length === 0 && <p className="text-sm text-muted-foreground">এই কোর্সে কোনো লেসন নেই।</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>লেসন কন্টেন্ট</CardTitle>
            <CardDescription>{selectedLesson ? `লেসন: ${selectedLesson.title}` : "আগে একটি লেসন সিলেক্ট করুন"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>কন্টেন্ট টাইপ</Label>
              <Select value={contentType} onValueChange={(v) => setContentType(v as LessonContentType)} disabled={selectedLessonId === "none"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>কন্টেন্ট শিরোনাম</Label>
              <Input value={contentTitle} onChange={(e) => setContentTitle(e.target.value)} disabled={selectedLessonId === "none"} />
            </div>

            {contentType === "text" ? (
              <div className="space-y-2">
                <Label>Text Editor</Label>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => applyTag("<b>", "</b>")} disabled={selectedLessonId === "none"}>Bold</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => applyTag("<i>", "</i>")} disabled={selectedLessonId === "none"}>Italic</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => applyTag("<h3>", "</h3>")} disabled={selectedLessonId === "none"}>Heading</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => applyTag("<ul><li>", "</li></ul>")} disabled={selectedLessonId === "none"}>List</Button>
                </div>
                <Textarea
                  ref={textEditorRef}
                  rows={6}
                  value={contentText}
                  onChange={(e) => setContentText(e.target.value)}
                  placeholder="Text/HTML content লিখুন..."
                  disabled={selectedLessonId === "none"}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>{contentType === "image" ? "Image URL" : "Video URL (YouTube/MP4)"}</Label>
                <Input value={contentMediaUrl} onChange={(e) => setContentMediaUrl(e.target.value)} disabled={selectedLessonId === "none"} />
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={() => void saveContent()} disabled={selectedLessonId === "none"}>
                <Plus className="mr-2 h-4 w-4" />
                {contentEditingId ? "কন্টেন্ট আপডেট" : "কন্টেন্ট যোগ"}
              </Button>
              {contentEditingId && <Button variant="outline" onClick={resetContentForm}>Cancel</Button>}
            </div>

            <div className="space-y-2 border-t pt-3">
              {contents.map((c) => (
                <div key={c.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{c.title || "Untitled block"}</p>
                      <div className="mt-1">{contentTypeBadge(c.content_type)}</div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setContentEditingId(c.id);
                          setContentType(c.content_type);
                          setContentTitle(c.title || "");
                          setContentText(c.text_content || "");
                          setContentMediaUrl(c.media_url || "");
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => void deleteContent(c.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {c.content_type === "text" && c.text_content && <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{c.text_content}</p>}
                  {(c.content_type === "image" || c.content_type === "video") && c.media_url && (
                    <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">{c.media_url}</p>
                  )}
                </div>
              ))}
              {selectedLessonId !== "none" && contents.length === 0 && <p className="text-sm text-muted-foreground">এই লেসনে এখনো কোনো কন্টেন্ট নেই।</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {loading && <p className="text-sm text-muted-foreground">লোড হচ্ছে...</p>}
    </div>
  );
}

