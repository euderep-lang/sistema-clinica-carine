-- Instruções personalizadas de treinamento da IA por profissional
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_budget_instructions text,
  ADD COLUMN IF NOT EXISTS ai_meal_plan_instructions text;

COMMENT ON COLUMN public.profiles.ai_budget_instructions IS
  'Instruções customizadas para o assistente de orçamentos (IA).';
COMMENT ON COLUMN public.profiles.ai_meal_plan_instructions IS
  'Instruções customizadas para o assistente de plano terapêutico (IA).';
