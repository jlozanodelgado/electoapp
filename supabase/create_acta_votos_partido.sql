-- ==============================================================================
-- TABLA ACTA_VOTOS_PARTIDO (votos normalizados por partido)
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.acta_votos_partido (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  acta_id TEXT NOT NULL REFERENCES public.actas_e14(id) ON DELETE CASCADE,
  partido_id UUID NOT NULL REFERENCES public.partidos(id) ON DELETE CASCADE,
  votos INTEGER NOT NULL DEFAULT 0,
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT acta_votos_partido_pkey PRIMARY KEY (id),
  CONSTRAINT acta_votos_partido_acta_id_partido_id_key UNIQUE (acta_id, partido_id)
);

-- Índice para consultas rápidas por acta
CREATE INDEX IF NOT EXISTS idx_acta_votos_partido_acta_id
  ON public.acta_votos_partido(acta_id);

-- Índice para consultas rápidas por partido
CREATE INDEX IF NOT EXISTS idx_acta_votos_partido_partido_id
  ON public.acta_votos_partido(partido_id);

-- Permisos y RLS
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.acta_votos_partido TO authenticated;

ALTER TABLE public.acta_votos_partido ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS acta_votos_partido_all ON public.acta_votos_partido;
CREATE POLICY acta_votos_partido_all ON public.acta_votos_partido
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Verificación
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'acta_votos_partido'
ORDER BY ordinal_position;

SELECT COUNT(*) as total_votos_partido FROM public.acta_votos_partido;
