-- ==============================================================================
-- ASEGURAR LA RELACIÓN candidatos -> partidos
-- Ejecutar en el SQL Editor de Supabase. Es idempotente: se puede correr varias veces.
-- ==============================================================================
-- Corrige el caso en que la tabla public.candidatos ya existía sin la columna
-- partido_id (por ejemplo, porque se creó con una versión anterior del esquema y
-- el CREATE TABLE IF NOT EXISTS no agregó las columnas nuevas).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Asegurar la tabla partidos
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  siglas TEXT NOT NULL UNIQUE,
  color TEXT,
  logo_url TEXT,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Igual que con candidatos: si la tabla ya existía, CREATE IF NOT EXISTS no
-- agrega columnas nuevas.
ALTER TABLE public.partidos ADD COLUMN IF NOT EXISTS nombre TEXT;
ALTER TABLE public.partidos ADD COLUMN IF NOT EXISTS siglas TEXT;
ALTER TABLE public.partidos ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE public.partidos ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.partidos ADD COLUMN IF NOT EXISTS creado_en TIMESTAMPTZ DEFAULT NOW();

-- ------------------------------------------------------------------------------
-- 2. Asegurar la tabla candidatos (si no existe)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.candidatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partido_id UUID,
  nombre TEXT NOT NULL,
  apellido TEXT,
  cedula TEXT NOT NULL,
  cargo TEXT NOT NULL,
  numero_tarjeton TEXT,
  numero_lista TEXT,
  departamento_id TEXT,
  municipio_id TEXT,
  foto_url TEXT,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. Agregar las columnas que espera la aplicación si faltan
-- ------------------------------------------------------------------------------
ALTER TABLE public.candidatos ADD COLUMN IF NOT EXISTS partido_id UUID;
ALTER TABLE public.candidatos ADD COLUMN IF NOT EXISTS apellido TEXT;
ALTER TABLE public.candidatos ADD COLUMN IF NOT EXISTS cedula TEXT;
ALTER TABLE public.candidatos ADD COLUMN IF NOT EXISTS cargo TEXT;
ALTER TABLE public.candidatos ADD COLUMN IF NOT EXISTS numero_tarjeton TEXT;
ALTER TABLE public.candidatos ADD COLUMN IF NOT EXISTS numero_lista TEXT;
ALTER TABLE public.candidatos ADD COLUMN IF NOT EXISTS departamento_id TEXT;
ALTER TABLE public.candidatos ADD COLUMN IF NOT EXISTS municipio_id TEXT;
ALTER TABLE public.candidatos ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE public.candidatos ADD COLUMN IF NOT EXISTS creado_en TIMESTAMPTZ DEFAULT NOW();

-- ------------------------------------------------------------------------------
-- 4. Si existe una columna antigua "partido" (texto), enlazarla por nombre o siglas
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'candidatos'
      AND column_name = 'partido'
      AND data_type IN ('text', 'character varying')
  ) THEN
    EXECUTE $sql$
      UPDATE public.candidatos c
      SET partido_id = p.id
      FROM public.partidos p
      WHERE c.partido_id IS NULL
        AND (
          lower(trim(c.partido)) = lower(trim(p.nombre))
          OR lower(trim(c.partido)) = lower(trim(p.siglas))
        )
    $sql$;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 5. Limpiar referencias a partidos que ya no existen antes de crear la FK
-- ------------------------------------------------------------------------------
UPDATE public.candidatos c
SET partido_id = NULL
WHERE c.partido_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.partidos p WHERE p.id = c.partido_id
  );

-- ------------------------------------------------------------------------------
-- 6. Crear la llave foránea si no existe para la columna partido_id
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_attribute att
      ON att.attrelid = con.conrelid
     AND att.attnum = ANY (con.conkey)
    WHERE con.conrelid = 'public.candidatos'::regclass
      AND con.contype = 'f'
      AND att.attname = 'partido_id'
  ) THEN
    ALTER TABLE public.candidatos
      ADD CONSTRAINT candidatos_partido_id_fkey
      FOREIGN KEY (partido_id) REFERENCES public.partidos(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_candidatos_partido_id
  ON public.candidatos(partido_id);

-- Si todos los registros ya tienen partido, dejamos la columna obligatoria.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.candidatos WHERE partido_id IS NULL) THEN
    ALTER TABLE public.candidatos ALTER COLUMN partido_id SET NOT NULL;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 7. Permisos y RLS para usuarios autenticados
-- ------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.partidos TO authenticated;
GRANT ALL ON public.candidatos TO authenticated;

ALTER TABLE public.candidatos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS candidatos_all ON public.candidatos;
CREATE POLICY candidatos_all ON public.candidatos
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ------------------------------------------------------------------------------
-- 8. Verificación: columnas resultantes y llaves foráneas de candidatos
-- ------------------------------------------------------------------------------
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'candidatos'
ORDER BY ordinal_position;

SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
 AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'candidatos'
  AND tc.constraint_type = 'FOREIGN KEY';
