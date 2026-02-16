INSERT INTO storage.buckets (id, name, public)
SELECT 'course-thumbnails', 'course-thumbnails', true
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'course-thumbnails'
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Course thumbnails public read'
  ) THEN
    CREATE POLICY "Course thumbnails public read"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'course-thumbnails');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Course thumbnails admin insert'
  ) THEN
    CREATE POLICY "Course thumbnails admin insert"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'course-thumbnails'
      AND public.has_role(auth.uid(), 'admin')
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Course thumbnails admin update'
  ) THEN
    CREATE POLICY "Course thumbnails admin update"
    ON storage.objects
    FOR UPDATE
    USING (
      bucket_id = 'course-thumbnails'
      AND public.has_role(auth.uid(), 'admin')
    )
    WITH CHECK (
      bucket_id = 'course-thumbnails'
      AND public.has_role(auth.uid(), 'admin')
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Course thumbnails admin delete'
  ) THEN
    CREATE POLICY "Course thumbnails admin delete"
    ON storage.objects
    FOR DELETE
    USING (
      bucket_id = 'course-thumbnails'
      AND public.has_role(auth.uid(), 'admin')
    );
  END IF;
END $$;
