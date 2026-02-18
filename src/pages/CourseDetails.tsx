import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, BookOpenCheck, CheckCircle2, Clock3, GraduationCap, PlayCircle, Users, ChevronDown, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { Tables } from "@/integrations/supabase/types";

type Course = Tables<"courses">;
type Lesson = Tables<"course_lessons">;
type LessonContent = Pick<Tables<"lesson_contents">, "lesson_id">;

export default function CourseDetails() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, hasRole } = useAuth();

  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [contentsCount, setContentsCount] = useState<Record<string, number>>({});
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());

  const totalContents = useMemo(
    () => Object.values(contentsCount).reduce((acc, count) => acc + count, 0),
    [contentsCount],
  );

  const goToLearning = () => {
    if (!course) return;
    navigate(`/student/courses/${course.id}/learn`);
  };

  const toggleLesson = (id: string) => {
    setExpandedLessons(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const enrollFreeCourse = async () => {
    if (!course) return;
    if (!user) { navigate("/auth"); return; }
    setEnrolling(true);
    const { error } = await supabase.from("course_enrollments").insert({ course_id: course.id, user_id: user.id });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("duplicate") || msg.includes("unique")) {
        setIsEnrolled(true);
        toast({ title: "আপনি ইতিমধ্যেই এনরোলড" });
        if (hasRole("student")) goToLearning();
      } else {
        toast({ title: "এনরোল ব্যর্থ", description: error.message, variant: "destructive" });
      }
      setEnrolling(false);
      return;
    }
    setIsEnrolled(true);
    setEnrolling(false);
    toast({ title: "এনরোল সফল হয়েছে" });
    if (hasRole("student")) goToLearning();
  };

  const startBkashCheckout = async () => {
    if (!course) return;
    if (!user) { navigate("/auth"); return; }
    setEnrolling(true);
    const response = await fetch(`${SUPABASE_URL}/functions/v1/bkash-checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_PUBLISHABLE_KEY },
      body: JSON.stringify({ action: "create", courseId: course.id, userId: user.id }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const readable = typeof payload?.details === "string" ? payload.details : (payload?.error || payload?.message || "Payment create failed");
      toast({ title: "পেমেন্ট শুরু ব্যর্থ", description: readable, variant: "destructive" });
      setEnrolling(false);
      return;
    }
    if (payload?.alreadyEnrolled) {
      setIsEnrolled(true);
      toast({ title: "আপনি ইতিমধ্যেই এনরোলড" });
      if (hasRole("student")) goToLearning();
      setEnrolling(false);
      return;
    }
    if (!payload?.bkashURL) {
      toast({ title: "bKash URL পাওয়া যায়নি", variant: "destructive" });
      setEnrolling(false);
      return;
    }
    window.location.href = String(payload.bkashURL);
  };

  useEffect(() => {
    const load = async () => {
      if (!slug) { setLoading(false); return; }

      const { data: courseData } = await supabase
        .from("courses").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
      if (!courseData) { setLoading(false); return; }
      setCourse(courseData);

      // Fetch lessons, contents, enrollment count, user enrollment in parallel
      const [lessonRes, enrollCountRes, userEnrollRes] = await Promise.all([
        supabase.from("course_lessons").select("*").eq("course_id", courseData.id).eq("is_published", true).order("sort_order"),
        supabase.rpc("get_course_enrollment_counts", { course_ids: [courseData.id] }),
        user
          ? supabase.from("course_enrollments").select("id").eq("course_id", courseData.id).eq("user_id", user.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const lessonRows = lessonRes.data || [];
      setLessons(lessonRows);

      const countRows = (enrollCountRes.data || []) as { course_id: string; total: number }[];
      setEnrollmentCount(countRows[0]?.total || 0);
      setIsEnrolled(Boolean(userEnrollRes.data));

      if (lessonRows.length > 0) {
        const lessonIds = lessonRows.map((l) => l.id);
        const { data: contentData } = await supabase.from("lesson_contents").select("lesson_id").in("lesson_id", lessonIds);
        const map: Record<string, number> = {};
        ((contentData || []) as LessonContent[]).forEach((c) => { map[c.lesson_id] = (map[c.lesson_id] || 0) + 1; });
        setContentsCount(map);
      }

      setLoading(false);
    };
    void load();
  }, [slug, user]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-semibold">কোর্স পাওয়া যায়নি</p>
            <p className="mt-1 text-sm text-muted-foreground">এই কোর্সটি হয়তো unpublished অথবা মুছে ফেলা হয়েছে।</p>
            <Link to="/" className="mt-4 inline-block"><Button variant="outline">হোমে ফিরে যান</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b">
        <div className="container py-8">
          <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> হোমে ফিরে যান
          </Link>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left: Course Info */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant={course.is_paid ? "default" : "secondary"} className="text-xs">
                  {course.is_paid ? "পেইড কোর্স" : "ফ্রি কোর্স"}
                </Badge>
              </div>

              <h1 className="text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl">
                {course.title}
              </h1>

              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                {course.summary || "এই কোর্সে ধাপে ধাপে লেসন দেয়া আছে।"}
              </p>

              {/* Meta pills */}
              <div className="flex flex-wrap items-center gap-4 pt-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-primary" />
                  <strong className="text-foreground">{enrollmentCount}</strong> জন শিক্ষার্থী
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BookOpenCheck className="h-4 w-4 text-primary" />
                  <strong className="text-foreground">{lessons.length}</strong> টি লেসন
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-4 w-4 text-primary" />
                  <strong className="text-foreground">{totalContents}</strong> টি কনটেন্ট
                </span>
              </div>
            </div>

            {/* Right: Enrollment Card */}
            <div className="lg:row-start-1 lg:col-start-3">
              <div className="overflow-hidden rounded-xl border bg-card shadow-lg">
                {/* Thumbnail */}
                {course.thumbnail_url && (
                  <div className="aspect-video w-full overflow-hidden">
                    <img src={course.thumbnail_url} alt={course.title} className="h-full w-full object-cover" />
                  </div>
                )}

                <div className="space-y-4 p-5">
                  {/* Price */}
                  <div className="text-center">
                    {course.is_paid ? (
                      <p className="text-3xl font-black text-primary">৳{Number(course.price || 0).toFixed(0)}</p>
                    ) : (
                      <p className="text-2xl font-black text-accent">ফ্রি</p>
                    )}
                  </div>

                  {/* CTA */}
                  {!isEnrolled ? (
                    <Button
                      onClick={() => void (course.is_paid ? startBkashCheckout() : enrollFreeCourse())}
                      disabled={enrolling}
                      className="w-full text-sm"
                      size="lg"
                    >
                      {enrolling
                        ? "প্রসেস হচ্ছে..."
                        : course.is_paid
                          ? `bKash দিয়ে পেমেন্ট করুন`
                          : "এখনই এনরোল করুন"}
                    </Button>
                  ) : (
                    <Button onClick={goToLearning} className="w-full" size="lg">
                      <PlayCircle className="mr-2 h-4 w-4" />
                      শেখা শুরু করুন
                    </Button>
                  )}

                  {!user && (
                    <p className="text-center text-xs text-muted-foreground">এনরোল করতে লগইন প্রয়োজন।</p>
                  )}
                  {isEnrolled && (
                    <p className="inline-flex w-full items-center justify-center gap-1.5 text-xs font-medium text-accent">
                      <CheckCircle2 className="h-3.5 w-3.5" /> আপনি এই কোর্সে এনরোলড
                    </p>
                  )}

                  {/* Quick info */}
                  <div className="space-y-2 border-t pt-3 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> শিক্ষার্থী</span>
                      <span className="font-medium text-foreground">{enrollmentCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><BookOpenCheck className="h-3.5 w-3.5" /> লেসন</span>
                      <span className="font-medium text-foreground">{lessons.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /> কনটেন্ট</span>
                      <span className="font-medium text-foreground">{totalContents}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course body */}
      <div className="container py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            {course.description && (
              <section className="space-y-3">
                <h2 className="text-xl font-bold">কোর্স বিবরণ</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{course.description}</p>
              </section>
            )}

            {/* Curriculum */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">কোর্স কারিকুলাম</h2>
                <span className="text-xs text-muted-foreground">{lessons.length} টি লেসন • {totalContents} টি কনটেন্ট</span>
              </div>

              {lessons.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    এই কোর্সে এখনো কোনো published lesson নেই।
                  </CardContent>
                </Card>
              ) : (
                <div className="overflow-hidden rounded-xl border">
                  {lessons.map((lesson, idx) => {
                    const isExpanded = expandedLessons.has(lesson.id);
                    const contentCount = contentsCount[lesson.id] || 0;
                    return (
                      <div key={lesson.id} className={idx > 0 ? "border-t" : ""}>
                        <button
                          onClick={() => toggleLesson(lesson.id)}
                          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/50"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{lesson.title}</p>
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground">{contentCount} কনটেন্ট</span>
                          {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                        </button>
                        {isExpanded && lesson.summary && (
                          <div className="border-t bg-muted/20 px-4 py-3 pl-14">
                            <p className="text-xs text-muted-foreground">{lesson.summary}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
