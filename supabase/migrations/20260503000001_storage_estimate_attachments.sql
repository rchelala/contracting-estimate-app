-- Create private bucket for estimate photo attachments.
-- File paths follow: {organization_id}/{estimate_id}/{uuid}-{filename}
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'estimate-attachments',
  'estimate-attachments',
  false,
  10485760, -- 10 MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: members of the org (encoded as the first path segment) can read/write.
CREATE POLICY "members can read estimate attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'estimate-attachments'
    AND public.is_org_member(((storage.foldername(name))[0])::uuid)
  );

CREATE POLICY "members can upload estimate attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'estimate-attachments'
    AND public.is_org_member(((storage.foldername(name))[0])::uuid)
  );

CREATE POLICY "members can delete estimate attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'estimate-attachments'
    AND public.is_org_member(((storage.foldername(name))[0])::uuid)
  );
