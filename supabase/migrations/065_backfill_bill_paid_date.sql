-- Faturas recebidas sem paid_date (importações / fluxos antigos) passam a ter data
-- para relatórios e cards financeiros. Prioridade: último pagamento → competência → vencimento.

UPDATE public.bills_receivable b
SET paid_date = src.fallback_date
FROM (
  SELECT
    br.id,
    COALESCE(
      (
        SELECT MAX(bp.paid_date)
        FROM public.bill_payments bp
        WHERE bp.bill_receivable_id = br.id
      ),
      br.competence_date,
      br.due_date
    ) AS fallback_date
  FROM public.bills_receivable br
  WHERE br.paid_amount > 0
    AND br.status IN ('paid', 'partial')
    AND br.paid_date IS NULL
) AS src
WHERE b.id = src.id
  AND src.fallback_date IS NOT NULL;
