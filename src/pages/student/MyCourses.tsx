import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, BookOpenCheck, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type Course = Pick<Tables<"courses">, "id" | "title" | "slug" | "summary" | "thumbnail_url">;
type Enrollment = Pick<Tables<"course_enrollments">, "course_id" | "enrolled_at">;
type Lesson = Pick<Tables<"course_lessons">, "id" | "course_id">;
type LessonProgress = Pick<Tables<"course_lesson_progress">, "lesson_id">;

interface EnrolledCourseCard extends Course {
  enrolled_at: string;
  total_lessons: number;
  completed_lessons: number;
}

export default function MyCourses() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<EnrolledCourseCard[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);

      const { data: enrollmentData } = await supabase
        .from("course_enrollments")
        .select("course_id, enrolled_at")
        .eq("user_id", user.id)
        .order("enrolled_at", { ascending: false });

      const enrollments = (enrollmentData || []) as Enrollment[];
      if (enrollments.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      const courseIds = enrollments.map((e) => e.course_id);

      const [{ data: courseData }, { data: lessonData }] = await Promise.all([
        supabase
          .from("courses")
          .select("id, title, slug, summary, thumbnail_url")
          .in("id", courseIds)
          .eq("status", "published"),
        supabase
          .from("course_lessons")
          .select("id, course_id")
          .in("course_id", courseIds)
          .eq("is_published", true),
      ]);

      const courses = (courseData || []) as Course[];
      const lessons = (lessonData || []) as Lesson[];
      const lessonIds = lessons.map((l) => l.id);

      let completedSet = new Set<string>();
      if (lessonIds.length > 0) {
        const { data: progressData } = await supabase
          .from("course_lesson_progress")
          .select("lesson_id")
          .eq("user_id", user.id)
          .eq("is_completed", true)
          .in("lesson_id", lessonIds);

        completedSet = new Set(((progressData || []) as LessonProgress[]).map((p) => p.lesson_id));
      }

      const totalLessonMap = new Map<string, number>();
      const completedLessonMap = new Map<string, number>();

      lessons.forEach((lesson) => {
        totalLessonMap.set(lesson.course_id, (totalLessonMap.get(lesson.course_id) || 0) + 1);
        if (completedSet.has(lesson.id)) {
          completedLessonMap.set(lesson.course_id, (completedLessonMap.get(lesson.course_id) || 0) + 1);
        }
      });

      const courseMap = new Map(courses.map((c) => [c.id, c]));
      const rows: EnrolledCourseCard[] = [];

      enrollments.forEach((enrollment) => {
        const course = courseMap.get(enrollment.course_id);
        if (!course) return;
        rows.push({
          ...course,
          enrolled_at: enrollment.enrolled_at,
          total_lessons: totalLessonMap.get(course.id) || 0,
          completed_lessons: completedLessonMap.get(course.id) || 0,
        });
      });

      setItems(rows);
      setLoading(false);
    };

    void load();
  }, [user]);

  const totalCompleted = useMemo(
    () => items.reduce((acc, item) => acc + item.completed_lessons, 0),
    [items],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">আমার কোর্স</h1>
          <p className="text-sm text-muted-foreground">এনরোল করা কোর্স থেকে শেখা শুরু করুন</p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <CheckCircle2 className="h-3 w-3" /> মোট সম্পন্ন লেসন: {totalCompleted}
        </Badge>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            এখনো কোনো কোর্সে এনরোল করা হয়নি।
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((course) => {
            const percent = course.total_lessons > 0
              ? Math.round((course.completed_lessons / course.total_lessons) * 100)
              : 0;
            const isComplete = percent === 100;

            return (
              <div
                key={course.id}
                className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                {/* Thumbnail */}
                <Link to={`/student/courses/${course.id}/learn`} className="relative block h-40 overflow-hidden bg-muted">
                  {course.thumbnail_url ? (
                    <img src={course.thumbnail_url} alt={course.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                      <BookOpenCheck className="h-10 w-10 text-muted-foreground/30" />
                    </div>
                  )}
                  {/* Progress overlay */}
                  {isComplete && (
                    <div className="absolute inset-0 flex items-center justify-center bg-accent/80">
                      <div className="text-center text-accent-foreground">
                        <CheckCircle2 className="mx-auto h-8 w-8" />
                        <p className="mt-1 text-xs font-bold">সম্পন্ন</p>
                      </div>
                    </div>
                  )}
                </Link>

                {/* Content */}
                <div className="flex flex-1 flex-col p-4">
                  <Link to={`/student/courses/${course.id}/learn`}>
                    <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-card-foreground transition-colors group-hover:text-primary">
                      {course.title}
                    </h3>
                  </Link>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {course.summary || "এই কোর্সে ধাপে ধাপে কনটেন্ট রয়েছে।"}
                  </p>

                  {/* Progress */}
                  <div className="mt-auto space-y-2 pt-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{course.completed_lessons}/{course.total_lessons} লেসন</span>
                      <span className="font-medium text-foreground">{percent}%</span>
                    </div>
                    <Progress value={percent} className="h-1.5" />
                  </div>

                  <Link to={`/student/courses/${course.id}/learn`} className="mt-3 block">
                    <Button size="sm" className="w-full gap-1.5 text-xs" variant={isComplete ? "secondary" : "default"}>
                      <BookOpen className="h-3.5 w-3.5" />
                      {isComplete ? "পুনরায় দেখুন" : "শেখা চালিয়ে যান"}
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
