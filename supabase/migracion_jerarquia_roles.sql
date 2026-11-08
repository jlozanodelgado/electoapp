-- ==============================================================================
-- MIGRACIÓN: JERARQUÍA DE ROLES ELECTOAPP
-- Supervisor Total → Partidos y Candidatos
-- Supervisor de Candidato → Líderes, Testigos, Votantes
-- Líder → Testigos y Votantes (amarrados a su líder)
-- ==============================================================================
-- Ejecutar en tu Supabase VPS. Es idempotente (se puede correr varias veces).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLA PARTIDOS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  siglas TEXT NOT NULL UNIQUE,
  color TEXT,
  logo_url TEXT,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.partidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS partidos_lectura_publica ON public.partidos;
CREATE POLICY partidos_lectura_publica ON public.partidos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS partidos_total_supervisor_escritura ON public.partidos;
CREATE POLICY partidos_total_supervisor_escritura ON public.partidos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.actors a
      WHERE a.user_id = auth.uid()
        AND a.role = 'supervisor_total'::actor_role
    )
  );

-- ------------------------------------------------------------------------------
-- 2. TABLA CANDIDATOS (amarrados a un partido)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.candidatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partido_id UUID NOT NULL REFERENCES public.partidos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  apellido TEXT,
  cedula TEXT NOT NULL UNIQUE,
  cargo TEXT NOT NULL, -- 'presidente', 'alcalde', 'concejal', etc.
  numero_tarjeton TEXT,
  numero_lista TEXT, -- Para cargos de corporación (concejo, asamblea)
  departamento_id TEXT REFERENCES public.departamentos(id) ON DELETE SET NULL,
  municipio_id TEXT REFERENCES public.municipios(id) ON DELETE SET NULL,
  foto_url TEXT,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.candidatos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS candidatos_lectura_publica ON public.candidatos;
CREATE POLICY candidatos_lectura_publica ON public.candidatos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS candidatos_total_supervisor_escritura ON public.candidatos;
CREATE POLICY candidatos_total_supervisor_escritura ON public.candidatos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.actors a
      WHERE a.user_id = auth.uid()
        AND a.role = 'supervisor_total'::actor_role
    )
  );

-- ------------------------------------------------------------------------------
-- 3. COLUMNAS ADICIONALES EN actors (jerarquía)
-- ------------------------------------------------------------------------------
ALTER TABLE public.actors
  ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES public.actors(id) ON DELETE SET NULL;

ALTER TABLE public.actors
  ADD COLUMN IF NOT EXISTS candidato_id UUID REFERENCES public.candidatos(id) ON DELETE SET NULL;

ALTER TABLE public.actors
  ADD COLUMN IF NOT EXISTS leader_id UUID REFERENCES public.actors(id) ON DELETE SET NULL;

-- FK explícita si no existe (por si la tabla actors ya tenía columnas sin nombre de restricción)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'actors' AND constraint_name = 'actors_supervisor_id_fkey'
  ) THEN
    ALTER TABLE public.actors
      ADD CONSTRAINT actors_supervisor_id_fkey
      FOREIGN KEY (supervisor_id) REFERENCES public.actors(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'actors' AND constraint_name = 'actors_candidato_id_fkey'
  ) THEN
    ALTER TABLE public.actors
      ADD CONSTRAINT actors_candidato_id_fkey
      FOREIGN KEY (candidato_id) REFERENCES public.candidatos(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'actors' AND constraint_name = 'actors_leader_id_fkey'
  ) THEN
    ALTER TABLE public.actors
      ADD CONSTRAINT actors_leader_id_fkey
      FOREIGN KEY (leader_id) REFERENCES public.actors(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. COLUMNAS leader_id EN TABLAS DE DATOS (quién creó / a quién pertenece)
-- ------------------------------------------------------------------------------
ALTER TABLE public.testigos_electorales
  ADD COLUMN IF NOT EXISTS leader_id UUID REFERENCES public.actors(id) ON DELETE SET NULL;

ALTER TABLE public.votantes_crm
  ADD COLUMN IF NOT EXISTS leader_id UUID REFERENCES public.actors(id) ON DELETE SET NULL;

ALTER TABLE public.actas_e14
  ADD COLUMN IF NOT EXISTS leader_id UUID REFERENCES public.actors(id) ON DELETE SET NULL;

ALTER TABLE public.alertas_fraude
  ADD COLUMN IF NOT EXISTS leader_id UUID REFERENCES public.actors(id) ON DELETE SET NULL;

-- ------------------------------------------------------------------------------
-- 5. TABLA AUDIT LOG (quién cambió qué, cuándo y valores antes/después)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla TEXT NOT NULL,
  registro_id TEXT NOT NULL,
  accion TEXT NOT NULL CHECK (accion IN ('INSERT','UPDATE','DELETE')),
  valores_anteriores JSONB,
  valores_nuevos JSONB,
  actor_id UUID REFERENCES public.actors(id) ON DELETE SET NULL,
  actor_rol public.actor_role,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_log_total_supervisor ON public.audit_log;
CREATE POLICY audit_log_total_supervisor ON public.audit_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.actors a
      WHERE a.user_id = auth.uid()
        AND a.role = 'supervisor_total'::actor_role
    )
  );

DROP POLICY IF EXISTS audit_log_own ON public.audit_log;
CREATE POLICY audit_log_own ON public.audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.actors a
      WHERE a.user_id = auth.uid()
        AND a.id = audit_log.actor_id
    )
  );

-- ------------------------------------------------------------------------------
-- 6. FUNCIÓN DE AUDIT TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE v_actor_id UUID;
BEGIN
  SELECT a.id INTO v_actor_id
  FROM public.actors a
  WHERE a.user_id = auth.uid()
  LIMIT 1;

  IF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_log (tabla, registro_id, accion, valores_anteriores, valores_nuevos, actor_id, actor_rol)
    VALUES (TG_TABLE_NAME, COALESCE(OLD.id::text, OLD::text), 'DELETE', to_jsonb(OLD), NULL, v_actor_id,
            (SELECT role FROM public.actors WHERE id = v_actor_id));
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_log (tabla, registro_id, accion, valores_anteriores, valores_nuevos, actor_id, actor_rol)
    VALUES (TG_TABLE_NAME, COALESCE(NEW.id::text, OLD::text), 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), v_actor_id,
            (SELECT role FROM public.actors WHERE id = v_actor_id));
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_log (tabla, registro_id, accion, valores_anteriores, valores_nuevos, actor_id, actor_rol)
    VALUES (TG_TABLE_NAME, COALESCE(NEW.id::text, NEW::text), 'INSERT', NULL, to_jsonb(NEW), v_actor_id,
            (SELECT role FROM public.actors WHERE id = v_actor_id));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 7. TRIGGERS DE AUDITORÍA EN TABLAS DE DATOS
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_audit_testigos_electorales ON public.testigos_electorales;
CREATE TRIGGER trg_audit_testigos_electorales
  AFTER INSERT OR UPDATE OR DELETE ON public.testigos_electorales
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS trg_audit_votantes_crm ON public.votantes_crm;
CREATE TRIGGER trg_audit_votantes_crm
  AFTER INSERT OR UPDATE OR DELETE ON public.votantes_crm
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS trg_audit_actas_e14 ON public.actas_e14;
CREATE TRIGGER trg_audit_actas_e14
  AFTER INSERT OR UPDATE OR DELETE ON public.actas_e14
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS trg_audit_alertas_fraude ON public.alertas_fraude;
CREATE TRIGGER trg_audit_alertas_fraude
  AFTER INSERT OR UPDATE OR DELETE ON public.alertas_fraude
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- ------------------------------------------------------------------------------
-- 8. POLÍTICAS RLS ACTUALIZADAS (jerarquía de roles)
-- ------------------------------------------------------------------------------

-- ---- actas_e14 ----
ALTER TABLE public.actas_e14 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS actas_total_supervisor ON public.actas_e14;
CREATE POLICY actas_total_supervisor ON public.actas_e14
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.actors a
      WHERE a.user_id = auth.uid()
        AND a.role = 'supervisor_total'::actor_role
    )
  );

DROP POLICY IF EXISTS actas_supervisor_candidato_lectura ON public.actas_e14;
CREATE POLICY actas_supervisor_candidato_lectura ON public.actas_e14
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.actors a
      WHERE a.user_id = auth.uid()
        AND a.role = 'supervisor_candidato'::actor_role
    )
  );

DROP POLICY IF EXISTS actas_lider_lectura ON public.actas_e14;
CREATE POLICY actas_lider_lectura ON public.actas_e14
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.actors a
      WHERE a.user_id = auth.uid()
        AND a.role = 'lider'::actor_role
    )
  );

DROP POLICY IF EXISTS actas_testigo_own ON public.actas_e14;
CREATE POLICY actas_testigo_own ON public.actas_e14
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.actors a
      WHERE a.user_id = auth.uid()
        AND a.role = 'testigo'::actor_role
        AND actas_e14.leader_id = a.id
    )
  );

-- ---- alertas_fraude ----
ALTER TABLE public.alertas_fraude ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS alertas_total_supervisor ON public.alertas_fraude;
CREATE POLICY alertas_total_supervisor ON public.alertas_fraude
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.actors a
      WHERE a.user_id = auth.uid()
        AND a.role = 'supervisor_total'::actor_role
    )
  );

DROP POLICY IF EXISTS alertas_supervisor_candidato_escritura ON public.alertas_fraude;
CREATE POLICY alertas_supervisor_candidato_escritura ON public.alertas_fraude
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.actors a
      WHERE a.user_id = auth.uid()
        AND a.role = 'supervisor_candidato'::actor_role
    )
  );

DROP POLICY IF EXISTS alertas_lider_escritura ON public.alertas_fraude;
CREATE POLICY alertas_lider_escritura ON public.alertas_fraude
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.actors a
      WHERE a.user_id = auth.uid()
        AND a.role = 'lider'::actor_role
    )
  );

DROP POLICY IF EXISTS alertas_testigo_own ON public.alertas_fraude;
CREATE POLICY alertas_testigo_own ON public.alertas_fraude
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.actors a
      WHERE a.user_id = auth.uid()
        AND a.role = 'testigo'::actor_role
        AND alertas_fraude.leader_id = a.id
    )
  );

-- ---- testigos_electorales ----
ALTER TABLE public.testigos_electorales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS testigos_total_supervisor ON public.testigos_electorales;
CREATE POLICY testigos_total_supervisor ON public.testigos_electorales
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.actors a
      WHERE a.user_id = auth.uid()
        AND a.role = 'supervisor_total'::actor_role
    )
  );

DROP POLICY IF EXISTS testigos_supervisor_candidato_lectura ON public.testigos_electorales;
CREATE POLICY testigos_supervisor_candidato_lectura ON public.testigos_electorales
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.actors a
      WHERE a.user_id = auth.uid()
        AND a.role = 'supervisor_candidato'::actor_role
    )
  );

DROP POLICY IF EXISTS testigos_lider_lectura ON public.testigos_electorales;
CREATE POLICY testigos_lider_lectura ON public.testigos_electorales
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.actors a
      WHERE a.user_id = auth.uid()
        AND a.role = 'lider'::actor_role
    )
  );

DROP POLICY IF EXISTS testigos_testigo_own ON public.testigos_electorales;
CREATE POLICY testigos_testigo_own ON public.testigos_electorales
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.actors a
      WHERE a.user_id = auth.uid()
        AND a.role = 'testigo'::actor_role
        AND testigos_electorales.leader_id = a.id
    )
  );

-- ---- votantes_crm ----
ALTER TABLE public.votantes_crm ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS votantes_total_supervisor ON public.votantes_crm;
CREATE POLICY votantes_total_supervisor ON public.votantes_crm
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.actors a
      WHERE a.user_id = auth.uid()
        AND a.role = 'supervisor_total'::actor_role
    )
  );

DROP POLICY IF EXISTS votantes_supervisor_candidato_lectura ON public.votantes_crm;
CREATE POLICY votantes_supervisor_candidato_lectura ON public.votantes_crm
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.actors a
      WHERE a.user_id = auth.uid()
        AND a.role = 'supervisor_candidato'::actor_role
    )
  );

DROP POLICY IF EXISTS votantes_lider_lectura ON public.votantes_crm;
CREATE POLICY votantes_lider_lectura ON public.votantes_crm
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.actors a
      WHERE a.user_id = auth.uid()
        AND a.role = 'lider'::actor_role
    )
  );

DROP POLICY IF EXISTS votantes_testigo_own ON public.votantes_crm;
CREATE POLICY votantes_testigo_own ON public.votantes_crm
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.actors a
      WHERE a.user_id = auth.uid()
        AND a.role = 'testigo'::actor_role
        AND votantes_crm.leader_id = a.id
    )
  );

-- ------------------------------------------------------------------------------
-- 9. VERIFICACIÓN FINAL
-- ------------------------------------------------------------------------------
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'
  AND tablename IN ('partidos','candidatos','actors','actas_e14','alertas_fraude','testigos_electorales','votantes_crm','audit_log')
  ORDER BY tablename;

SELECT conname, conrelid::regclass AS tabla FROM pg_constraint
  WHERE conrelid::regclass::text IN ('public.actors','public.actas_e14','public.alertas_fraude','public.testigos_electorales','public.votantes_crm')
    AND contype = 'f'
  ORDER BY conname;
