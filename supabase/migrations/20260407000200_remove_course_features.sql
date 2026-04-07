DROP FUNCTION IF EXISTS public.get_course_enrollment_counts(UUID[]);

DROP TABLE IF EXISTS public.lesson_contents CASCADE;
DROP TABLE IF EXISTS public.course_lesson_progress CASCADE;
DROP TABLE IF EXISTS public.course_payments CASCADE;
DROP TABLE IF EXISTS public.course_enrollments CASCADE;
DROP TABLE IF EXISTS public.course_lessons CASCADE;
DROP TABLE IF EXISTS public.courses CASCADE;
DROP TABLE IF EXISTS public.course_categories CASCADE;

DROP TYPE IF EXISTS public.lesson_content_type;
DROP TYPE IF EXISTS public.course_status;

DELETE FROM public.payment_gateway_settings
WHERE provider = 'bkash';
