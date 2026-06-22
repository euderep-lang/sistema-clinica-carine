-- Anexos de prontuário podem incluir PDFs de ~10–15 MB (fotos consolidadas).
UPDATE storage.buckets
SET file_size_limit = 52428800
WHERE id = 'patient-documents';
