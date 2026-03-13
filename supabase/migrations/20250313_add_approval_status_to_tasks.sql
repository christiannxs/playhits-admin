-- Adiciona coluna approval_status à tabela tasks.
-- Demanda reprovada = paga metade do valor (regra aplicada no app).
-- Valores: 'approved' (padrão) | 'rejected'

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'approved'
CHECK (approval_status IN ('approved', 'rejected'));

COMMENT ON COLUMN tasks.approval_status IS 'approved = valor integral; rejected = valor pago é metade (regra no app).';
