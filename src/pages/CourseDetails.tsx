import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, BookOpenCheck, CheckCircle2, Clock3, PlayCircle } from "lucide-react";
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

  const totalContents = useMemo(
    () => Object.values(contentsCount).reduce((acc, count) => acc + count, 0),
    [contentsCount],
  );

  const goToLearning = () => {
    if (!course) return;
    navigate(`/student/courses/${course.id}/learn`);
  };

  const enrollFreeCourse = async () => {
    if (!course) return;
    if (!user) {
      navigate("/auth");
      return;
    }

    setEnrolling(true);
    const { error } = await supabase.from("course_enrollments").insert({
      course_id: course.id,
      user_id: user.id,
    });

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
    toast({ title: "এনরোল সফল হয়েছে" });
    if (hasRole("student")) goToLearning();
  };

  const startBkashCheckout = async () => {
    if (!course) return;
    if (!user) {
      navigate("/auth");
      return;
    }

    setEnrolling(true);
    const response = await fetch(`${SUPABASE_URL}/functions/v1/bkash-checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        action: "create",
        courseId: course.id,
        userId: user.id,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const readable = typeof payload?.details === "string"
        ? payload.details
        : (payload?.error || payload?.message || "Payment create failed");
      toast({ title: "পেমেন্ট শুরু ব্যর্থ", description: readable, variant: "destructive" });
      setEnrolling(false);
      return;
    }

    const data = payload;
    if (data?.alreadyEnrolled) {
      setIsEnrolled(true);
      toast({ title: "আপনি ইতিমধ্যেই এনরোলড" });
      if (hasRole("student")) goToLearning();
      setEnrolling(false);
      return;
    }

    if (!data?.bkashURL) {
      toast({ title: "bKash URL পাওয়া যায়নি", variant: "destructive" });
      setEnrolling(false);
      return;
    }

    window.location.href = String(data.bkashURL);
  };

  useEffect(() => {
    const load = async () => {
      if (!slug) {
        setLoading(false);
        return;
      }

      const { data: courseData } = await supabase
        .from("courses")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();

      if (!courseData) {
        setLoading(false);
        return;
      }
      setCourse(courseData);

      const { data: lessonData } = await supabase
        .from("course_lessons")
        .select("*")
        .eq("course_id", courseData.id)
        .eq("is_published", true)
        .order("sort_order");

      const lessonRows = lessonData || [];
      setLessons(lessonRows);

      if (lessonRows.length > 0) {
        const lessonIds = lessonRows.map((l) => l.id);
        const { data: contentData } = await supabase
          .from("lesson_contents")
          .select("lesson_id")
          .in("lesson_id", lessonIds);

        const map: Record<string, number> = {};
        ((contentData || []) as LessonContent[]).forEach((c) => {
          map[c.lesson_id] = (map[c.lesson_id] || 0) + 1;
        });
        setContentsCount(map);
      }

      if (user) {
        const { data: enrollment } = await supabase
          .from("course_enrollments")
          .select("id")
          .eq("course_id", courseData.id)
          .eq("user_id", user.id)
          .maybeSingle();
        setIsEnrolled(Boolean(enrollment));
      }

      setLoading(false);
    };

    void load();
  }, [slug, user]);

  if (loading) {
    return (
      <div className="container py-12">
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-semibold">কোর্স পাওয়া যায়নি</p>
            <p className="mt-1 text-sm text-muted-foreground">এই কোর্সটি হয়তো unpublished অথবা মুছে ফেলা হয়েছে।</p>
            <Link to="/" className="mt-4 inline-block">
              <Button variant="outline">হোমে ফিরে যান</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container space-y-6 py-10">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> হোমে ফিরে যান
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-2xl">{course.title}</CardTitle>
            <CardDescription>{course.summary || "এই কোর্সে ধাপে ধাপে লেসন দেয়া আছে।"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {course.thumbnail_url && (
              <div className="overflow-hidden rounded-xl border">
                <img src={course.thumbnail_url} alt={course.title} className="h-60 w-full object-cover" />
              </div>
            )}
            <p className="text-sm leading-relaxed text-muted-foreground">{course.description || "বিস্তারিত বিবরণ যোগ করা হয়নি।"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>এনরোল</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BookOpenCheck className="h-4 w-4" /> {lessons.length} টি লেসন
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock3 className="h-4 w-4" /> {totalContents} টি কনটেন্ট ব্লক
            </div>
            <Badge variant={course.is_paid ? "default" : "secondary"}>
              {course.is_paid ? `পেইড - ৳${Number(course.price || 0).toFixed(2)}` : "ফ্রি কোর্স"}
            </Badge>

            {!isEnrolled ? (
              <Button
                onClick={() => void (course.is_paid ? startBkashCheckout() : enrollFreeCourse())}
                disabled={enrolling}
                className="w-full"
              >
                {enrolling
                  ? "প্রসেস হচ্ছে..."
                  : course.is_paid
                    ? `bKash দিয়ে ৳${Number(course.price || 0).toFixed(2)} পেমেন্ট করুন`
                    : "এখনই এনরোল করুন"}
              </Button>
            ) : (
              <Button onClick={goToLearning} className="w-full">
                <PlayCircle className="mr-2 h-4 w-4" />
                শেখা শুরু করুন
              </Button>
            )}

            {!user && <p className="text-xs text-muted-foreground">এনরোল করতে লগইন প্রয়োজন।</p>}
            {isEnrolled && (
              <p className="inline-flex items-center gap-1 text-xs text-primary">
                <CheckCircle2 className="h-3 w-3" /> আপনি এই কোর্সে এনরোলড
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>কোর্স লেসনসমূহ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lessons.length === 0 ? (
            <p className="text-sm text-muted-foreground">এই কোর্সে এখনো কোনো published lesson নেই।</p>
          ) : (
            lessons.map((lesson, idx) => (
              <div key={lesson.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{idx + 1}. {lesson.title}</p>
                  <p className="text-xs text-muted-foreground">{lesson.summary || "No summary"}</p>
                </div>
                <Badge variant="outline" className="gap-1">
                  <Clock3 className="h-3 w-3" /> {contentsCount[lesson.id] || 0} contents
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
