-- Transferências pendentes: destinatário vê até marcar como vista (seen_at)

ALTER TABLE public.wa_transfers
  ADD COLUMN IF NOT EXISTS seen_at timestamptz;

-- Transferências anteriores à feature contam como já vistas
UPDATE public.wa_transfers
SET seen_at = created_at
WHERE seen_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_wa_transfers_pending_recipient
  ON public.wa_transfers (to_user_id, created_at DESC)
  WHERE seen_at IS NULL;

CREATE POLICY wa_transfers_update ON public.wa_transfers FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND to_user_id = auth.uid()
  )
  WITH CHECK (to_user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_transfers;
