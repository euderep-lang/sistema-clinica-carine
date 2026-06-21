-- Sincronizar nome/cargo na sessão quando o admin editar o perfil

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN OTHERS THEN
    IF SQLERRM LIKE '%already member of publication%' THEN
      NULL;
    ELSE
      RAISE;
    END IF;
END $$;
