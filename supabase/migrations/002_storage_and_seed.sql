-- Exportado de jglzghujpxbakqqmmple
-- Data: 2026-06-14T18:42:26.705Z
-- Gerado por: bun run scripts/export-schema.ts

-- Buckets de storage referenciados no código
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('patient-documents', 'patient-documents', false, 52428800, null),
  ('prescriptions', 'prescriptions', false, 52428800, ARRAY['application/pdf']),
  ('professional-assets', 'professional-assets', false, 10485760, ARRAY['image/png','image/jpeg','image/webp','application/pdf']),
  ('tenant-assets', 'tenant-assets', false, 10485760, ARRAY['image/png','image/jpeg','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Tenant inicial (usuário master vem de bun run db:seed)
INSERT INTO public.tenants (id, name, slug, active)
VALUES ('00000000-0000-0000-0000-000000000001', 'Clínica', 'clinica', true)
ON CONFLICT (id) DO NOTHING;
