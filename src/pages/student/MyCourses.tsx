import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CheckCircle2 } from "lucide-react";

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
          <p className="text-sm text-muted-foreground">এনরোল করা কোর্স থেকে শেখা শুরু করুন এবং প্রগ্রেস ট্র্যাক করুন।</p>
        </div>
        <Badge variant="secondary">মোট সম্পন্ন লেসন: {totalCompleted}</Badge>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            এখনো কোনো কোর্সে এনরোল করা হয়নি।
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((course) => {
            const percent = course.total_lessons > 0
              ? Math.round((course.completed_lessons / course.total_lessons) * 100)
              : 0;

            return (
              <Card key={course.id} className="flex flex-col overflow-hidden">
                <div className="h-36 w-full border-b bg-muted/20">
                  {course.thumbnail_url ? (
                    <img src={course.thumbnail_url} alt={course.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No Thumbnail</div>
                  )}
                </div>
                <CardHeader>
                  <CardTitle className="line-clamp-2 text-lg">{course.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {course.summary || "এই কোর্সে ধাপে ধাপে কনটেন্ট রয়েছে।"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{course.completed_lessons}/{course.total_lessons} লেসন সম্পন্ন</span>
                    <span>{percent}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/student/courses/${course.id}/learn`} className="flex-1">
                      <Button className="w-full">
                        <BookOpen className="mr-2 h-4 w-4" />
                        শেখা চালিয়ে যান
                      </Button>
                    </Link>
                    {percent === 100 && (
                      <Badge variant="outline" className="gap-1 self-center">
                        <CheckCircle2 className="h-3 w-3" /> সম্পন্ন
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
