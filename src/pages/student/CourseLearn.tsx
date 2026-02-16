import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ChevronLeft, PlayCircle, Image as ImageIcon, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Course = Pick<Tables<"courses">, "id" | "title" | "slug" | "summary" | "thumbnail_url">;
type Lesson = Pick<Tables<"course_lessons">, "id" | "title" | "summary" | "sort_order" | "course_id">;
type LessonContent = Tables<"lesson_contents">;
type LessonProgress = Pick<Tables<"course_lesson_progress">, "lesson_id">;

const toEmbeddableVideoUrl = (rawUrl: string): string => {
  try {
    const input = rawUrl.trim();
    if (!input) return input;
    const url = new URL(input);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
      let videoId = "";

      if (host === "youtu.be") {
        videoId = url.pathname.split("/").filter(Boolean)[0] || "";
      } else if (url.pathname === "/watch") {
        videoId = url.searchParams.get("v") || "";
      } else if (url.pathname.startsWith("/shorts/")) {
        videoId = url.pathname.split("/")[2] || "";
      } else if (url.pathname.startsWith("/embed/")) {
        return input;
      }

      if (videoId) {
        const embedUrl = new URL(`https://www.youtube.com/embed/${videoId}`);
        embedUrl.searchParams.set("rel", "0");
        embedUrl.searchParams.set("modestbranding", "1");
        embedUrl.searchParams.set("iv_load_policy", "3");
        embedUrl.searchParams.set("playsinline", "1");
        return embedUrl.toString();
      }
    }

    if (host === "youtube-nocookie.com" && url.pathname.startsWith("/embed/")) {
      url.searchParams.set("rel", "0");
      url.searchParams.set("modestbranding", "1");
      url.searchParams.set("iv_load_policy", "3");
      url.searchParams.set("playsinline", "1");
      return url.toString();
    }

    return input;
  } catch {
    return rawUrl;
  }
};

export default function CourseLearn() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [contents, setContents] = useState<LessonContent[]>([]);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user || !courseId) return;
      setLoading(true);

      const [{ data: enrollData }, { data: courseData }] = await Promise.all([
        supabase
          .from("course_enrollments")
          .select("id")
          .eq("user_id", user.id)
          .eq("course_id", courseId)
          .maybeSingle(),
        supabase
          .from("courses")
          .select("id, title, slug, summary, thumbnail_url")
          .eq("id", courseId)
          .eq("status", "published")
          .maybeSingle(),
      ]);

      if (!enrollData || !courseData) {
        setEnrolled(false);
        setCourse(null);
        setLessons([]);
        setContents([]);
        setCompletedLessonIds(new Set());
        setActiveLessonId(null);
        setLoading(false);
        return;
      }

      setEnrolled(true);
      setCourse(courseData as Course);

      const { data: lessonData } = await supabase
        .from("course_lessons")
        .select("id, title, summary, sort_order, course_id")
        .eq("course_id", courseId)
        .eq("is_published", true)
        .order("sort_order");

      const lessonRows = (lessonData || []) as Lesson[];
      setLessons(lessonRows);

      if (lessonRows.length > 0) {
        const lessonIds = lessonRows.map((l) => l.id);
        const [{ data: contentData }, { data: progressData }] = await Promise.all([
          supabase
            .from("lesson_contents")
            .select("*")
            .in("lesson_id", lessonIds)
            .order("sort_order"),
          supabase
            .from("course_lesson_progress")
            .select("lesson_id")
            .eq("user_id", user.id)
            .eq("course_id", courseId)
            .eq("is_completed", true),
        ]);

        setContents((contentData || []) as LessonContent[]);
        const completed = new Set(((progressData || []) as LessonProgress[]).map((p) => p.lesson_id));
        setCompletedLessonIds(completed);

        const firstIncomplete = lessonRows.find((l) => !completed.has(l.id));
        setActiveLessonId(firstIncomplete?.id || lessonRows[0].id);
      } else {
        setContents([]);
        setCompletedLessonIds(new Set());
        setActiveLessonId(null);
      }

      setLoading(false);
    };

    void load();
  }, [user, courseId]);

  const lessonMap = useMemo(() => {
    const map = new Map<string, LessonContent[]>();
    contents.forEach((content) => {
      const list = map.get(content.lesson_id) || [];
      list.push(content);
      map.set(content.lesson_id, list);
    });
    return map;
  }, [contents]);

  const activeLesson = useMemo(
    () => lessons.find((l) => l.id === activeLessonId) || null,
    [lessons, activeLessonId],
  );

  const activeContents = activeLesson ? (lessonMap.get(activeLesson.id) || []) : [];
  const completedCount = completedLessonIds.size;
  const totalCount = lessons.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const markLessonComplete = async () => {
    if (!user || !courseId || !activeLesson) return;
    setSaving(true);

    const { error } = await supabase
      .from("course_lesson_progress")
      .upsert(
        {
          user_id: user.id,
          course_id: courseId,
          lesson_id: activeLesson.id,
          is_completed: true,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,lesson_id" },
      );

    if (error) {
      toast({ title: "লেসন আপডেট ব্যর্থ", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    setCompletedLessonIds((prev) => new Set([...prev, activeLesson.id]));
    toast({ title: "লেসন সম্পন্ন হয়েছে" });
    setSaving(false);
  };

  const markLessonIncomplete = async () => {
    if (!user || !activeLesson) return;
    setSaving(true);

    const { error } = await supabase
      .from("course_lesson_progress")
      .delete()
      .eq("user_id", user.id)
      .eq("lesson_id", activeLesson.id);

    if (error) {
      toast({ title: "স্ট্যাটাস আপডেট ব্যর্থ", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    setCompletedLessonIds((prev) => {
      const next = new Set(prev);
      next.delete(activeLesson.id);
      return next;
    });
    toast({ title: "লেসন অসম্পূর্ণ হিসেবে সেট হয়েছে" });
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!enrolled || !course) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>কোর্স শেখা শুরু করা যায়নি</CardTitle>
          <CardDescription>এই কোর্সে এনরোল না থাকলে লার্নিং পেজে প্রবেশ করা যাবে না।</CardDescription>
        </CardHeader>
        <CardContent>
          <Link to="/student/courses">
            <Button>
              <ChevronLeft className="mr-2 h-4 w-4" />
              আমার কোর্সে ফিরুন
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/student/courses" className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="mr-1 h-4 w-4" /> আমার কোর্স
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{course.title}</h1>
          <p className="text-sm text-muted-foreground">{course.summary || "কোর্স লার্নিং সেশন"}</p>
        </div>
        <Badge variant="secondary">{completedCount}/{totalCount} লেসন সম্পন্ন</Badge>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-lg">লেসন তালিকা</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lessons.length === 0 ? (
              <p className="text-sm text-muted-foreground">এখনো কোনো published lesson নেই।</p>
            ) : (
              lessons.map((lesson, index) => {
                const done = completedLessonIds.has(lesson.id);
                const active = lesson.id === activeLessonId;
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => setActiveLessonId(lesson.id)}
                    className={`w-full rounded-lg border p-3 text-left transition ${active ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{index + 1}. {lesson.title}</p>
                      {done ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{lesson.summary || "কোনো সারাংশ নেই"}</p>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle className="text-lg">{activeLesson?.title || "লেসন নির্বাচন করুন"}</CardTitle>
            {activeLesson?.summary && <CardDescription>{activeLesson.summary}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
            {!activeLesson ? (
              <p className="text-sm text-muted-foreground">বামে থাকা লেসন তালিকা থেকে একটি লেসন নির্বাচন করুন।</p>
            ) : activeContents.length === 0 ? (
              <p className="text-sm text-muted-foreground">এই লেসনে এখনো কোনো কনটেন্ট নেই।</p>
            ) : (
              activeContents.map((content) => (
                <div key={content.id} className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2">
                    {content.content_type === "text" && <FileText className="h-4 w-4 text-primary" />}
                    {content.content_type === "image" && <ImageIcon className="h-4 w-4 text-primary" />}
                    {content.content_type === "video" && <PlayCircle className="h-4 w-4 text-primary" />}
                    <p className="text-sm font-semibold">{content.title || "কনটেন্ট"}</p>
                    <Badge variant="outline">{content.content_type}</Badge>
                  </div>

                  {content.content_type === "text" && (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {content.text_content || "টেক্সট কনটেন্ট পাওয়া যায়নি।"}
                    </p>
                  )}

                  {content.content_type === "image" && (
                    <div className="space-y-2">
                      {content.media_url ? (
                        <img src={content.media_url} alt={content.title || "lesson image"} className="max-h-[420px] w-full rounded-md border object-contain" />
                      ) : (
                        <p className="text-sm text-muted-foreground">ইমেজ URL দেয়া নেই।</p>
                      )}
                      {content.text_content && (
                        <p className="text-sm text-muted-foreground">{content.text_content}</p>
                      )}
                    </div>
                  )}

                  {content.content_type === "video" && (
                    <div className="space-y-2">
                      {content.media_url ? (
                        <div className="overflow-hidden rounded-md border">
                          <iframe
                            src={toEmbeddableVideoUrl(content.media_url)}
                            title={content.title || "lesson video"}
                            className="h-72 w-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">ভিডিও URL দেয়া নেই।</p>
                      )}
                      {content.text_content && (
                        <p className="text-sm text-muted-foreground">{content.text_content}</p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}

            {activeLesson && (
              <div className="flex gap-2 pt-1">
                {!completedLessonIds.has(activeLesson.id) ? (
                  <Button onClick={() => void markLessonComplete()} disabled={saving}>
                    {saving ? "সেভ হচ্ছে..." : "লেসন সম্পন্ন করুন"}
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => void markLessonIncomplete()} disabled={saving}>
                    {saving ? "সেভ হচ্ছে..." : "অসম্পূর্ণ করুন"}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
