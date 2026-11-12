-- ==============================================================================
-- TABLA ZONAS (escalable: cada zona es un registro con FK al municipio)
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.zonas (
  id TEXT PRIMARY KEY,
  municipio_id TEXT NOT NULL REFERENCES public.municipios(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  codigo TEXT,
  censo BIGINT DEFAULT 0,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsquedas rápidas por municipio
CREATE INDEX IF NOT EXISTS idx_zonas_municipio_id ON public.zonas(municipio_id);

-- Permisos y RLS para usuarios autenticados
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.zonas TO authenticated;

ALTER TABLE public.zonas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS zonas_all ON public.zonas;
CREATE POLICY zonas_all ON public.zonas
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Verificación: columnas y filas de zonas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'zonas'
ORDER BY ordinal_position;

SELECT COUNT(*) AS total_zonas FROM public.zonas;
