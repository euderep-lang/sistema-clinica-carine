-- Foto de perfil do contato WhatsApp (cache da URL Z-API, expira ~48h no WhatsApp)

ALTER TABLE public.wa_conversations
  ADD COLUMN IF NOT EXISTS contact_photo_url text,
  ADD COLUMN IF NOT EXISTS contact_photo_fetched_at timestamptz;
