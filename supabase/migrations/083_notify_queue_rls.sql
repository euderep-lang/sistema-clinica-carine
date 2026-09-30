-- A fila de avisos de consulta só é usada pelo servidor (service role).
-- Sem RLS, a chave pública do projeto conseguia ler e alterar essa tabela.

ALTER TABLE public.wa_appointment_notify_queue ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.wa_appointment_notify_queue FROM anon, authenticated;
