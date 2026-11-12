-- ==============================================================================
-- OTORGAR PERMISOS AL ROL authenticated EN TODAS LAS TABLAS
-- Ejecutar en Supabase SQL Editor
-- ==============================================================================

-- Otorgar permisos al rol authenticated (usuarios autenticados via auth.users)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- También otorgar al rol postgres (por si acaso)
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Habilitar RLS en todas las tablas (permisos ya están, RLS filtra)
ALTER TABLE public.partidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.puestos_votacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testigos_electorales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votantes_crm ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actas_e14 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas_fraude ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.municipios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_electoral ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Políticas simples: permitir todo a usuarios autenticados
DROP POLICY IF EXISTS partidos_all ON public.partidos;
CREATE POLICY partidos_all ON public.partidos FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS candidatos_all ON public.candidatos;
CREATE POLICY candidatos_all ON public.candidatos FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS actors_all ON public.actors;
CREATE POLICY actors_all ON public.actors FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS puestos_votacion_all ON public.puestos_votacion;
CREATE POLICY puestos_votacion_all ON public.puestos_votacion FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS testigos_electorales_all ON public.testigos_electorales;
CREATE POLICY testigos_electorales_all ON public.testigos_electorales FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS votantes_crm_all ON public.votantes_crm;
CREATE POLICY votantes_crm_all ON public.votantes_crm FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS actas_e14_all ON public.actas_e14;
CREATE POLICY actas_e14_all ON public.actas_e14 FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS alertas_fraude_all ON public.alertas_fraude;
CREATE POLICY alertas_fraude_all ON public.alertas_fraude FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS departamentos_all ON public.departamentos;
CREATE POLICY departamentos_all ON public.departamentos FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS municipios_all ON public.municipios;
CREATE POLICY municipios_all ON public.municipios FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS historico_electoral_all ON public.historico_electoral;
CREATE POLICY historico_electoral_all ON public.historico_electoral FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS audit_log_all ON public.audit_log;
CREATE POLICY audit_log_all ON public.audit_log FOR ALL USING (auth.uid() IS NOT NULL);

SELECT 'Permisos y políticas RLS configurados correctamente' as resultado;
