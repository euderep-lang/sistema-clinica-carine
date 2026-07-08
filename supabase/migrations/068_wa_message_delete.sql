-- ---------------------------------------------------------------------------
-- Apagar mensagem (igual ao WhatsApp: "apagar para todos" / "apagar para mim")
-- ---------------------------------------------------------------------------
-- Não reaproveitamos a coluna `status` porque ela tem CHECK restrito
-- (pending/sent/delivered/read/failed). Guardamos a exclusão em colunas
-- próprias para preservar auditoria e permitir refletir exclusões do contato.

ALTER TABLE public.wa_messages
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_scope text
    CHECK (deleted_scope IN ('everyone', 'me'));

COMMENT ON COLUMN public.wa_messages.deleted_at IS
  'Quando a mensagem foi apagada no CRM (ou refletida do WhatsApp).';
COMMENT ON COLUMN public.wa_messages.deleted_scope IS
  'everyone = apagada para ambas as partes (revoke no WhatsApp); me = apagada só no CRM.';
