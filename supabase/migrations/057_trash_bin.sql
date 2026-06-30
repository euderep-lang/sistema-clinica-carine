-- Lixeira central: tudo que for excluído (conteúdo do usuário) fica aqui por 30
-- dias com um snapshot (JSON) do registro + filhos, permitindo restauração.
-- Visualização/restauração/limpeza: somente administradores.

CREATE TABLE IF NOT EXISTS public.trash_bin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  label text NOT NULL DEFAULT '',
  summary text,
  snapshot jsonb NOT NULL,
  deleted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  deleted_by_name text,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  restored_at timestamptz
);

CREATE INDEX IF NOT EXISTS trash_bin_tenant_idx
  ON public.trash_bin (tenant_id, deleted_at DESC);
CREATE INDEX IF NOT EXISTS trash_bin_expires_idx
  ON public.trash_bin (expires_at);

ALTER TABLE public.trash_bin ENABLE ROW LEVEL SECURITY;

-- Qualquer membro do tenant pode jogar algo na lixeira (ao excluir).
DROP POLICY IF EXISTS trash_bin_insert ON public.trash_bin;
CREATE POLICY trash_bin_insert ON public.trash_bin
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- Apenas administradores veem, restauram (update) e limpam (delete).
DROP POLICY IF EXISTS trash_bin_admin_select ON public.trash_bin;
CREATE POLICY trash_bin_admin_select ON public.trash_bin
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() = 'admin'
  );

DROP POLICY IF EXISTS trash_bin_admin_update ON public.trash_bin;
CREATE POLICY trash_bin_admin_update ON public.trash_bin
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() = 'admin'
  )
  WITH CHECK (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS trash_bin_admin_delete ON public.trash_bin;
CREATE POLICY trash_bin_admin_delete ON public.trash_bin
  FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() = 'admin'
  );

-- Limpeza dos itens com mais de 30 dias (ou já restaurados).
CREATE OR REPLACE FUNCTION public.purge_expired_trash()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.trash_bin
  WHERE expires_at < now() OR restored_at IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.purge_expired_trash() TO authenticated;
